import { Link, useLocation } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const location = useLocation();
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800">
        <Compass size={26} className="text-slate-500 dark:text-zinc-400" />
      </div>
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-zinc-100">This page isn't on the map</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
        We couldn't find <span className="font-mono text-slate-700 dark:text-zinc-300">{location.pathname}</span>. It may
        have moved, or the link was mistyped.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/map"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          <Compass size={16} />
          Explore the Map
        </Link>
        <Link
          to="/square"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
        >
          <ArrowLeft size={16} />
          Back to the Square
        </Link>
      </div>
    </div>
  );
}
