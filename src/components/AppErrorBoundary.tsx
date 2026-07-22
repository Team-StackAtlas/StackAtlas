import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/** Timestamp of the last auto-reload, so a genuinely broken chunk can't loop. */
const RELOAD_KEY = 'sa-chunk-reload-at';

/**
 * A failed dynamic import — the usual cause of the "click a tab, get a blank
 * white page, fixed by refresh" glitch — surfaces with one of these messages
 * once a deploy has rotated the chunk hashes out from under an open tab.
 */
function isChunkLoadError(error: Error): boolean {
  const msg = error.message || '';
  return (
    error.name === 'ChunkLoadError' ||
    /failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /importing a module script failed/i.test(msg)
  );
}

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * App-wide safety net. Without it, any render error (most commonly a stale
 * lazy-route chunk after a deploy) escapes React and blanks the whole page
 * with no way back except a manual refresh. This catches it, auto-reloads
 * once for the chunk case to pull the fresh build, and otherwise shows a
 * recoverable fallback instead of a white screen.
 */
export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (isChunkLoadError(error)) {
      const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
      // Reload at most once per 10s: fixes the stale-chunk case, but if the
      // module is genuinely unreachable we fall through to the fallback
      // rather than reload-looping.
      if (Date.now() - last > 10_000) {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
        window.location.reload();
        return;
      }
    }
    console.error('App crashed', error);
  }

  private handleReload = () => {
    sessionStorage.removeItem(RELOAD_KEY);
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center dark:bg-zinc-950">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 dark:bg-amber-500/10">
          <AlertTriangle size={28} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Something went wrong</h1>
          <p className="mt-1.5 max-w-sm text-sm text-slate-500 dark:text-zinc-400">
            This page failed to load — it can happen right after the app updates. Reloading usually fixes it.
          </p>
        </div>
        <button
          onClick={this.handleReload}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600 dark:text-zinc-950 dark:hover:bg-emerald-400"
        >
          <RefreshCw size={16} />
          Reload
        </button>
      </div>
    );
  }
}
