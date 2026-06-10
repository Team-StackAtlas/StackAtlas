import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isProfileComplete } from '../lib/account';

/**
 * Protects routes that create/change user-specific state. Public browsing stays
 * open; only action routes should use this wrapper.
 */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status, profile, isBackendConfigured } = useAuth();
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}${location.hash}`;

  if (status === 'loading') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500 dark:text-zinc-400">
        Loading…
      </div>
    );
  }
  if (isBackendConfigured && status !== 'authenticated') {
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }
  if (isBackendConfigured && !isProfileComplete(profile)) {
    return <Navigate to={`/profile?complete=1&returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }
  return <>{children}</>;
}
