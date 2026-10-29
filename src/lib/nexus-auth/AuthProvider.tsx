import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { NexusAuthClient } from './NexusAuthClient';
import type { NexusAuthConfig, NexusAuthStatus, NexusUser } from './types';

interface NexusAuthContextValue {
  status: NexusAuthStatus;
  user: NexusUser | null;
  error: Error | null;
  /** Redirects to the identity server; resolves when the browser navigates away. */
  login: (returnTo?: string) => Promise<void>;
  logout: (returnTo?: string) => Promise<void>;
  /** Returns a valid access token, refreshing if needed. */
  getAccessToken: () => Promise<string | null>;
  hasRole: (role: string | string[]) => boolean;
  /** Exposed so callers can build their own fetch wrapper. */
  client: NexusAuthClient;
}

const NexusAuthContext = createContext<NexusAuthContextValue | null>(null);

export interface AuthProviderProps {
  config: NexusAuthConfig;
  children: ReactNode;
  /** Rendered while the initial session check runs. */
  fallback?: ReactNode;
}

/**
 * Wraps the app, restores the session on boot and exposes auth helpers.
 *
 * Access tokens are held in memory by {@link NexusAuthClient}; this provider
 * only mirrors the derived user into React state.
 */
export function AuthProvider({ config, children, fallback = null }: AuthProviderProps) {
  // Recreate the client only when the identifying config actually changes.
  const client = useMemo(
    () => new NexusAuthClient(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.issuer, config.clientId, config.redirectPath, config.scope, config.defaultReturnTo],
  );

  const [status, setStatus] = useState<NexusAuthStatus>('loading');
  const [user, setUser] = useState<NexusUser | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    let cancelled = false;
    const unsubscribe = client.subscribe(() => {
      if (cancelled) return;
      setUser(client.getUser());
    });

    client
      .initialize()
      .then((restored) => {
        if (cancelled) return;
        setUser(restored);
        setStatus(restored ? 'authenticated' : 'anonymous');
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause : new Error(String(cause)));
        setUser(null);
        setStatus('anonymous');
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [client]);

  const login = useCallback((returnTo?: string) => client.login(returnTo), [client]);
  const logout = useCallback((returnTo?: string) => client.logout(returnTo), [client]);
  const getAccessToken = useCallback(() => client.getAccessToken(), [client]);
  const hasRole = useCallback((role: string | string[]) => client.hasRole(role), [client]);

  const value = useMemo<NexusAuthContextValue>(
    () => ({ status, user, error, login, logout, getAccessToken, hasRole, client }),
    [status, user, error, login, logout, getAccessToken, hasRole, client],
  );

  if (status === 'loading') {
    return <>{fallback}</>;
  }

  return <NexusAuthContext.Provider value={value}>{children}</NexusAuthContext.Provider>;
}

export function useNexusAuth(): NexusAuthContextValue {
  const context = useContext(NexusAuthContext);
  if (!context) {
    throw new Error('useNexusAuth must be used inside <AuthProvider>.');
  }
  return context;
}
