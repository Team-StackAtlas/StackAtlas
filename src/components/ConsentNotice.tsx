import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';

const KEY = 'stackatlas_consent_notice';

function read() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return true; // storage unavailable: nothing is persisted, so nothing to notify about
  }
}

/**
 * First-visit notice. StackAtlas sets no tracking cookies and loads no
 * third-party scripts, so this is a disclosure, not a consent gate: it says
 * what the browser stores and links to the full policy.
 */
export default function ConsentNotice() {
  const [dismissed, setDismissed] = useState(read);
  if (dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <section
      role="region"
      aria-label="Storage notice"
      className="fixed inset-x-0 bottom-16 z-40 mx-auto max-w-2xl px-3 md:bottom-4"
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 text-sm text-slate-700 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 dark:text-zinc-300 sm:flex-row sm:items-center">
        <Cookie size={18} className="hidden shrink-0 text-emerald-600 dark:text-emerald-400 sm:block" aria-hidden="true" />
        <p className="flex-1">
          StackAtlas uses <strong>no tracking cookies</strong> and no third-party analytics. Your browser stores only
          what the site needs to work — your sign-in, theme, and display settings — and we never record what you read.{' '}
          <Link to="/legal/cookies" className="font-medium text-emerald-700 underline dark:text-emerald-400">
            See exactly what is stored
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Got it
        </button>
      </div>
    </section>
  );
}
