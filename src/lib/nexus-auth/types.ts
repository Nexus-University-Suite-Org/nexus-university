export interface NexusAuthConfig {
  /** Base URL of Nexus Identity, e.g. https://identity.nexus.ac.ug */
  issuer: string;
  /** Client id registered for this application. */
  clientId: string;
  /** Path the identity server redirects back to. Default: /auth/callback */
  redirectPath?: string;
  /** Space separated. Default: openid profile email roles offline_access */
  scope?: string;
  /** Where to send the user after login when no explicit return target. Default: / */
  defaultReturnTo?: string;
}

export interface NexusUser {
  sub: string;
  email: string;
  name?: string;
  roles: string[];
  sid?: string;
  /** Epoch seconds. */
  exp?: number;
}

export interface NexusTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number;
  scope?: string;
}

export type NexusAuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface NexusAuthState {
  status: NexusAuthStatus;
  user: NexusUser | null;
  error: Error | null;
}
