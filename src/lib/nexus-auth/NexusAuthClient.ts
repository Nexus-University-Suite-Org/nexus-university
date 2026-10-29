import { createPkcePair, decodeJwtPayload, randomString } from './pkce';
import type { NexusAuthConfig, NexusTokens, NexusUser } from './types';

const PENDING_KEY = 'nexus.sso.pending';
const REFRESH_PREFIX = 'nexus.sso.refresh.';
const USER_PREFIX = 'nexus.sso.user.';

interface PendingRequest {
  verifier: string;
  state: string;
  returnTo: string;
  createdAt: number;
}

interface TokenEndpointResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

/**
 * Framework-agnostic OIDC client for the Nexus University suite.
 *
 * Access tokens live in memory only; the rotating refresh token is persisted so
 * a page reload does not force a full round-trip through the identity server.
 */
export class NexusAuthClient {
  readonly config: Required<Omit<NexusAuthConfig, 'defaultReturnTo'>> & { defaultReturnTo: string };

  private tokens: NexusTokens | null = null;
  private refreshInFlight: Promise<NexusTokens | null> | null = null;
  private listeners = new Set<() => void>();

  constructor(config: NexusAuthConfig) {
    this.config = {
      issuer: config.issuer.replace(/\/+$/, ''),
      clientId: config.clientId,
      redirectPath: config.redirectPath ?? '/auth/callback',
      scope: config.scope ?? 'openid profile email roles offline_access',
      defaultReturnTo: config.defaultReturnTo ?? '/',
    };
  }

  get issuer(): string {
    return this.config.issuer;
  }

  get redirectUri(): string {
    return `${window.location.origin}${this.config.redirectPath}`;
  }

  // ── session storage keys ──────────────────────────────────────────────────

  private get refreshKey(): string {
    return REFRESH_PREFIX + this.config.clientId;
  }

  private get userKey(): string {
    return USER_PREFIX + this.config.clientId;
  }

  // ── login ─────────────────────────────────────────────────────────────────

  async login(returnTo?: string): Promise<void> {
    const { verifier, challenge } = await createPkcePair();
    const state = randomString(16);
    const target = returnTo ?? window.location.pathname + window.location.search;

    const pending: PendingRequest = {
      verifier,
      state,
      returnTo: target,
      createdAt: Date.now(),
    };
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.redirectUri,
      scope: this.config.scope,
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });
    window.location.assign(`${this.config.issuer}/oauth2/authorize?${params.toString()}`);
  }

  /** Call once on boot. Returns the signed-in user, or null when anonymous. */
  async initialize(): Promise<NexusUser | null> {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (code && state) {
      const pending = this.readPending();
      // Strip the response from the address bar before doing anything else.
      url.searchParams.delete('code');
      url.searchParams.delete('state');
      url.searchParams.delete('session_id');
      window.history.replaceState({}, document.title, url.toString());

      if (!pending || pending.state !== state) {
        throw new Error('Sign-in could not be verified. Please try again.');
      }
      sessionStorage.removeItem(PENDING_KEY);

      await this.exchangeCode(code, pending.verifier);
      window.history.replaceState(
        {},
        document.title,
        `${window.location.origin}${pending.returnTo || this.config.defaultReturnTo}`,
      );
      return this.getUser();
    }

    if (error) {
      url.searchParams.delete('error');
      url.searchParams.delete('error_description');
      url.searchParams.delete('state');
      window.history.replaceState({}, document.title, url.toString());
      throw new Error(url.searchParams.get('error_description') || error);
    }

    const stored = this.readStoredRefresh();
    if (!stored) return null;

    const refreshed = await this.refresh();
    return refreshed ? this.getUser() : null;
  }

  private readPending(): PendingRequest | null {
    try {
      const raw = sessionStorage.getItem(PENDING_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PendingRequest;
      // Abandon stuck attempts after 10 minutes.
      if (Date.now() - parsed.createdAt > 10 * 60 * 1000) {
        sessionStorage.removeItem(PENDING_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private async exchangeCode(code: string, verifier: string): Promise<void> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
      client_id: this.config.clientId,
      code_verifier: verifier,
    });
    const response = await fetch(`${this.config.issuer}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const payload = (await response.json()) as TokenEndpointResponse;
    if (!response.ok || payload.error) {
      throw new Error(payload.error_description || payload.error || 'Sign-in failed.');
    }
    this.store(payload);
  }

  // ── tokens ────────────────────────────────────────────────────────────────

  private store(payload: TokenEndpointResponse): void {
    this.tokens = {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      idToken: payload.id_token,
      scope: payload.scope,
      expiresAt: Date.now() + payload.expires_in * 1000,
    };
    if (payload.refresh_token) {
      localStorage.setItem(this.refreshKey, payload.refresh_token);
    }
    const user = this.getUser();
    if (user) {
      localStorage.setItem(this.userKey, JSON.stringify(user));
    }
    this.emit();
  }

  private readStoredRefresh(): string | null {
    return localStorage.getItem(this.refreshKey);
  }

  /** Returns a valid access token, refreshing transparently when needed. */
  async getAccessToken(): Promise<string | null> {
    if (this.tokens && this.tokens.expiresAt - Date.now() > 60_000) {
      return this.tokens.accessToken;
    }
    if (this.readStoredRefresh()) {
      const refreshed = await this.refresh();
      return refreshed?.accessToken ?? null;
    }
    return this.tokens?.accessToken ?? null;
  }

  private async refresh(): Promise<NexusTokens | null> {
    if (this.refreshInFlight) return this.refreshInFlight;

    const refreshToken = this.readStoredRefresh();
    if (!refreshToken) return null;

    this.refreshInFlight = (async () => {
      try {
        const body = new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.config.clientId,
        });
        const response = await fetch(`${this.config.issuer}/oauth2/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        });
        const payload = (await response.json()) as TokenEndpointResponse;
        if (!response.ok || payload.error) {
          this.clear();
          return null;
        }
        this.store(payload);
        return this.tokens;
      } catch {
        // Network blips should not sign the user out immediately.
        return this.tokens;
      } finally {
        this.refreshInFlight = null;
      }
    })();

    return this.refreshInFlight;
  }

  // ── user ──────────────────────────────────────────────────────────────────

  getUser(): NexusUser | null {
    const token = this.tokens?.accessToken;
    if (token) {
      const claims = decodeJwtPayload(token);
      if (claims) {
        return {
          sub: String(claims.sub ?? ''),
          email: String(claims.email ?? ''),
          name: typeof claims.name === 'string' ? claims.name : undefined,
          roles: Array.isArray(claims.roles) ? claims.roles.map(String) : [],
          sid: typeof claims.sid === 'string' ? claims.sid : undefined,
          exp: typeof claims.exp === 'number' ? claims.exp : undefined,
        };
      }
    }
    try {
      const raw = localStorage.getItem(this.userKey);
      return raw ? (JSON.parse(raw) as NexusUser) : null;
    } catch {
      return null;
    }
  }

  hasRole(role: string | string[]): boolean {
    const user = this.getUser();
    if (!user) return false;
    const wanted = Array.isArray(role) ? role : [role];
    return wanted.some((candidate) => user.roles.includes(candidate));
  }

  // ── logout ────────────────────────────────────────────────────────────────

  async logout(returnTo?: string): Promise<void> {
    const refreshToken = this.readStoredRefresh();
    if (refreshToken) {
      try {
        await fetch(`${this.config.issuer}/oauth2/revoke`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token: refreshToken }),
        });
      } catch {
        // Best effort — clearing local state is what matters.
      }
    }
    this.clear();

    const postLogout = `${window.location.origin}${returnTo ?? this.config.defaultReturnTo}`;
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      post_logout_redirect_uri: postLogout,
    });
    window.location.assign(`${this.config.issuer}/oauth2/logout?${params.toString()}`);
  }

  private clear(): void {
    this.tokens = null;
    localStorage.removeItem(this.refreshKey);
    localStorage.removeItem(this.userKey);
    this.emit();
  }

  // ── subscription ──────────────────────────────────────────────────────────

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}
