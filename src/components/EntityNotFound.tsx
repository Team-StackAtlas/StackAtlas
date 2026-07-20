import { Link } from 'react-router-dom';
import { SearchX, Compass } from 'lucide-react';

// Shown on a detail page (substance / brand / stack) when the id in the URL
// doesn't resolve — e.g. the entity was removed or the link is stale. Gives a
// clear message and a way back, instead of a bare "not found" line.
export function EntityNotFound({ label }: { label: string }) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800">
        <SearchX size={26} className="text-slate-500 dark:text-zinc-400" />
      </div>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">{label} not found</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
        It may have been removed, or the link is out of date.
      </p>
      <Link
        to="/map"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
      >
        <Compass size={16} />
        Explore the Map
      </Link>
    </div>
  );
}
