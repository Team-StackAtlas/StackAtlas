import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Layers, User, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { validateUsername } from '../lib/account';
import { useToast } from '../components/ui/ToastProvider';

function getAuthErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return 'Authentication failed.';
}

export default function Login() {
  const { signIn, signUp, isBackendConfigured } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isBackendConfigured || submitting) return;
    if (mode === 'signup' && username) {
      const usernameError = validateUsername(username);
      if (usernameError) {
        toast(usernameError, 'error');
        return;
      }
    }
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await signUp(email, password, username || undefined);
        toast('Account created. Check your email if confirmation is required.', 'success');
      } else {
        await signIn(email, password);
        toast('Signed in.', 'success');
      }
      const returnTo = searchParams.get('returnTo');
      const next = returnTo || (mode === 'signup' ? '/profile?complete=1' : '/map');
      navigate(next);
    } catch (err) {
      toast(getAuthErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 pl-10 text-base outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-emerald-500 md:text-sm sm:h-12';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-zinc-950 dark:to-zinc-900">
      <div className="w-full max-w-md">
        <div className="relative overflow-hidden rounded-2xl border-0 bg-white/95 text-slate-900 shadow-2xl backdrop-blur-sm dark:bg-zinc-900/95 dark:text-zinc-100">
          <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-emerald-500/40 dark:via-emerald-400/60 dark:to-emerald-500/40"></div>
          <div className="p-8 sm:p-10 md:px-10 md:pb-10 md:pt-12">
            <div className="flex flex-col items-center space-y-6 text-center sm:space-y-8">
              <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-lg dark:border-emerald-400/30 dark:from-emerald-500 dark:to-emerald-700 sm:h-24 sm:w-24">
                <Layers size={40} className="relative z-10 text-emerald-400 drop-shadow-md dark:text-white sm:h-12 sm:w-12" strokeWidth={2.5} />
              </div>

              <div className="space-y-2 sm:space-y-3">
                <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-zinc-50 sm:text-3xl">
                  Stack<span className="text-emerald-600 dark:text-emerald-400">Atlas</span>
                </h1>
                <p className="text-sm font-medium text-slate-500 dark:text-zinc-400 sm:text-base">
                  {mode === 'signup' ? 'Create your account' : 'Sign in to continue'}
                </p>
              </div>

              {!isBackendConfigured && (
                <div className="flex w-full items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>
                    Authentication isn't configured in this environment. Set{' '}
                    <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to enable
                    accounts.
                  </span>
                </div>
              )}

              <form className="w-full space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-3 sm:space-y-4">
                  {mode === 'signup' && (
                    <div className="space-y-1.5 text-left">
                      <label className="text-sm font-medium text-slate-700 dark:text-zinc-300" htmlFor="username">Username</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} placeholder="yourname" />
                      </div>
                    </div>
                  )}
                  <div className="space-y-1.5 text-left">
                    <label className="text-sm font-medium text-slate-700 dark:text-zinc-300" htmlFor="email">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="you@example.com" required />
                    </div>
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-sm font-medium text-slate-700 dark:text-zinc-300" htmlFor="password">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" required />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={!isBackendConfigured || submitting}
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500 sm:h-12"
                  >
                    {submitting ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
                    className="w-full text-sm text-slate-500 transition-colors hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    {mode === 'signup' ? (
                      <>Already have an account? <span className="font-medium text-slate-700 dark:text-zinc-200">Sign in</span></>
                    ) : (
                      <>Need an account? <span className="font-medium text-slate-700 dark:text-zinc-200">Sign up</span></>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
