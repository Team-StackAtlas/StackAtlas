import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Protects a route. When the backend is configured, unauthenticated users are
 * redirected to /login. When it's NOT configured (offline/dev), the route is
 * passed through so the prototype keeps working.
 */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500 dark:text-zinc-400">
        Loading…
      </div>
    );
  }
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }
  // 'authenticated' or 'unconfigured' → render.
  return <>{children}</>;
}
