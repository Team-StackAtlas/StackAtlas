import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

const KEY = 'stackatlas_age_confirmed';

function read() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * One-time adults-only gate with the informational / no-endorsement notice.
 * Stored on the device only (see the cookie policy); never sent to a server.
 */
export default function AgeGate() {
  const [confirmed, setConfirmed] = useState(read);
  const [declined, setDeclined] = useState(false);
  if (confirmed) return null;

  const confirm = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    setConfirmed(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 sm:p-8">
        <div className="mb-4 flex items-center gap-3">
          <ShieldAlert size={24} className="shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <h1 id="age-gate-title" className="text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">
            Before you enter
          </h1>
        </div>
        {declined ? (
          <p className="text-sm leading-relaxed">
            StackAtlas is for adults only. Thanks for being honest — please come back when you are 18 or older.
          </p>
        ) : (
          <>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>
                <strong>You must be 18 or older</strong> (or the age of majority where you live) to use StackAtlas.
              </p>
              <p>
                StackAtlas is <strong>purely informational</strong>. It summarizes published research and
                community reports about supplements, peptides, nootropics, and other compounds — including some that
                are prescription-only, unapproved, or illegal in some countries. Listing a substance or brand here is{' '}
                <strong>not an endorsement</strong> and <strong>not medical advice</strong>. We do not endorse the use
                of any substance, steroid, or drug by anyone, and nothing here encourages unlawful or underage use.
              </p>
              <p className="text-slate-600 dark:text-zinc-400">
                Your reading here is private: we keep no record of what you view, and your access level stays on your
                device. See the{' '}
                <Link to="/legal/privacy" onClick={confirm} className="font-medium text-emerald-700 underline dark:text-emerald-400">
                  Privacy Policy
                </Link>{' '}
                and{' '}
                <Link to="/legal/terms" onClick={confirm} className="font-medium text-emerald-700 underline dark:text-emerald-400">
                  Terms of Service
                </Link>
                .
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeclined(true)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                I am under 18
              </button>
              <button
                type="button"
                onClick={confirm}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-emerald-700 dark:hover:bg-emerald-800"
              >
                I am 18 or older — continue
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
