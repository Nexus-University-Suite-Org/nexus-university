import { useEffect, type ReactNode } from 'react';
import { useNexusAuth } from './AuthProvider';

export interface RequireAuthProps {
  children: ReactNode;
  /** Accepts any one of these roles. Omit to only require a session. */
  roles?: string | string[];
  /** Where to return after sign-in. Defaults to the current URL. */
  returnTo?: string;
  /** Rendered instead of the default card while redirecting. */
  fallback?: ReactNode;
}

/**
 * Guards a subtree. Anonymous visitors are sent to the identity server
 * immediately rather than shown a local login form — that is what makes the
 * sign-in experience identical across every portal.
 */
export function RequireAuth({ children, roles, returnTo, fallback }: RequireAuthProps) {
  const { status, user, login, hasRole } = useNexusAuth();

  const authorised = status === 'authenticated' && user !== null
    && (!roles || hasRole(roles));

  useEffect(() => {
    if (status === 'anonymous') {
      void login(returnTo);
    }
  }, [status, login, returnTo]);

  if (status === 'loading') {
    return <>{fallback ?? <AuthSplash label="Checking your session…" />}</>;
  }

  if (status === 'anonymous') {
    return <>{fallback ?? <AuthSplash label="Taking you to sign in…" />}</>;
  }

  if (!authorised) {
    return <>{fallback ?? <AccessDenied roles={roles} />}</>;
  }

  return <>{children}</>;
}

function AuthSplash({ label }: { label: string }) {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'grid',
      placeItems: 'center',
      color: 'var(--muted-foreground, #64748b)',
      fontSize: 14,
      fontFamily: 'system-ui, sans-serif',
    }}>
      {label}
    </div>
  );
}

function AccessDenied({ roles }: { roles?: string | string[] }) {
  const { user, logout } = useNexusAuth();
  const wanted = roles ? (Array.isArray(roles) ? roles.join(', ') : roles) : null;

  return (
    <div style={{
      minHeight: '60vh',
      display: 'grid',
      placeItems: 'center',
      padding: 24,
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ maxWidth: 420, textAlign: 'center' }}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>No access to this portal</h1>
        <p style={{ color: '#64748b', lineHeight: 1.6 }}>
          You are signed in as <strong>{user?.email ?? 'an unknown user'}</strong>, but this
          account does not have the required access
          {wanted ? <> (<code>{wanted}</code>)</> : null}.
        </p>
        <p style={{ color: '#64748b', lineHeight: 1.6 }}>
          Contact the university administrator if you believe this is a mistake.
        </p>
        <button
          type="button"
          onClick={() => void logout()}
          style={{
            marginTop: 12,
            padding: '10px 18px',
            borderRadius: 10,
            border: '1px solid #cbd5e1',
            background: '#fff',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Sign in with a different account
        </button>
      </div>
    </div>
  );
}
