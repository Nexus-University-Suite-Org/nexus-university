export { NexusAuthClient } from './NexusAuthClient';
export { AuthProvider, useNexusAuth } from './AuthProvider';
export type { AuthProviderProps } from './AuthProvider';
export { RequireAuth } from './RequireAuth';
export type { RequireAuthProps } from './RequireAuth';
export { createPkcePair, decodeJwtPayload, randomString, sha256Base64Url } from './pkce';
export type {
  NexusAuthConfig,
  NexusAuthState,
  NexusAuthStatus,
  NexusTokens,
  NexusUser,
} from './types';

/** Builds an `Authorization` header value for a request to a Nexus backend. */
export async function bearerHeader(
  getAccessToken: () => Promise<string | null>,
): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
