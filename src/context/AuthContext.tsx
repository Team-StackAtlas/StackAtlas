import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase, isBackendConfigured } from '../services/supabase/client';
import { createSupabaseAccountServices } from '../services/supabase';
import type { ProfileDTO, SessionUser } from '../services/types';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'unconfigured';

type AccountServices = ReturnType<typeof createSupabaseAccountServices>;

interface AuthContextValue {
  status: AuthStatus;
  user: SessionUser | null;
  profile: ProfileDTO | null;
  isBackendConfigured: boolean;
  /** Account services (auth/profiles/saved/hidden/follows/notifications), or null when unconfigured. */
  services: AccountServices | null;
  signUp: (email: string, password: string, username?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const NOT_CONFIGURED = 'Authentication backend is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';

export function AuthProvider({ children }: { children: ReactNode }) {
  // Account services only exist when the backend is configured.
  const services = useMemo(
    () => (supabase ? createSupabaseAccountServices(supabase) : null),
    [],
  );
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [status, setStatus] = useState<AuthStatus>(
    isBackendConfigured ? 'loading' : 'unconfigured',
  );

  const refresh = async () => {
    if (!services) return;
    const current = await services.auth.getCurrentUser();
    setUser(current);
    setProfile(current ? await services.profiles.get(current.id) : null);
    setStatus(current ? 'authenticated' : 'unauthenticated');
  };

  useEffect(() => {
    if (!services || !supabase) return;
    refresh();
    const { data } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services]);

  const signUp = async (email: string, password: string, username?: string) => {
    if (!services) throw new Error(NOT_CONFIGURED);
    await services.auth.signUpWithEmail(email, password, username);
    await refresh();
  };

  const signIn = async (email: string, password: string) => {
    if (!services) throw new Error(NOT_CONFIGURED);
    await services.auth.signInWithEmail(email, password);
    await refresh();
  };

  const signOut = async () => {
    if (!services) throw new Error(NOT_CONFIGURED);
    await services.auth.signOut();
    setUser(null);
    setProfile(null);
    setStatus('unauthenticated');
  };

  return (
    <AuthContext.Provider
      value={{ status, user, profile, isBackendConfigured, services, signUp, signIn, signOut, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
