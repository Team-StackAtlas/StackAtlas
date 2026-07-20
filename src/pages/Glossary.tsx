import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Search } from 'lucide-react';
import { supabase } from '../services/supabase/client';
import { listGlossaryTerms, type GlossaryTerm } from '../services/glossary';
import { EmptyState } from '../components/EmptyState';

export default function Glossary() {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    listGlossaryTerms(supabase)
      .then((rows) => {
        if (cancelled) return;
        setTerms(rows);
        setLoaded(true);
      })
      .catch((err) => {
        console.error('Load glossary failed', err);
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load the glossary.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return terms;
    return terms.filter(
      (t) => t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q),
    );
  }, [terms, query]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pb-12 pt-6">
      <Link
        to="/lab"
        className="flex w-fit items-center gap-1 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Lab
      </Link>

      <div>
        <h1 className="flex items-center gap-2 text-3xl font-black text-slate-900 dark:text-white">
          <BookOpen size={26} className="text-emerald-500" />
          Glossary
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
          Plain-language definitions for supplement and research terms used across StackAtlas.
        </p>
      </div>

      {!supabase && (
        <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
          Backend not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to browse the
          glossary.
        </p>
      )}

      {supabase && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search terms and definitions"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
            />
          </div>

          {error && (
            <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}

          {loading && !loaded && (
            <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
              Loading glossary…
            </p>
          )}

          {!loading && loaded && filtered.length === 0 && (
            <EmptyState
              icon={BookOpen}
              title={terms.length === 0 ? 'No glossary terms yet' : 'No terms match this search'}
              description={terms.length === 0 ? 'Defined terms will appear here as they are added.' : 'Try a different search term.'}
            />
          )}

          <div className="space-y-3">
            {filtered.map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{entry.term}</h3>
                  {entry.category && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {entry.category}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-300">
                  {entry.definition}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
