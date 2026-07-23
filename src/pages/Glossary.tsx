import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Search } from 'lucide-react';
import { supabase } from '../services/supabase/client';
import { listGlossaryTerms, type GlossaryTerm } from '../services/glossary';
import { MOCK_GLOSSARY_TERMS } from '../data/mockGlossary';
import { GlossaryText } from '../components/GlossaryText';
import { EmptyState } from '../components/EmptyState';
import { usePageMeta } from '../hooks/usePageMeta';

export default function Glossary() {
  usePageMeta('Glossary', 'Plain-language definitions for supplement and research terms.');
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [searchParams] = useSearchParams();
  const activeTerm = searchParams.get('term');

  useEffect(() => {
    if (!supabase) {
      // No backend: browse the seed glossary so the page still works in demos.
      setTerms(MOCK_GLOSSARY_TERMS);
      setLoaded(true);
      return;
    }
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

  // When arriving via a "Full entry" link (?term=slug), scroll the entry into
  // view once the list has rendered.
  useEffect(() => {
    if (!activeTerm || !loaded) return;
    const el = document.getElementById(`term-${activeTerm}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeTerm, loaded]);

  // Relevance rank for search: exact term match, then term-starts-with, then
  // term-contains, then definition-only match — so "vitamin" surfaces the
  // Vitamin entries first instead of every definition that mentions the word.
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const scored = terms
      .map((t) => {
        const name = t.term.toLowerCase();
        let score = -1;
        if (name === q) score = 0;
        else if (name.startsWith(q)) score = 1;
        else if (name.includes(q)) score = 2;
        else if (t.definition.toLowerCase().includes(q)) score = 3;
        return { t, score };
      })
      .filter((r) => r.score >= 0)
      .sort((a, b) => a.score - b.score || a.t.term.localeCompare(b.t.term));
    return scored.map((r) => r.t);
  }, [terms, query]);

  // Grouped by category (alphabetical within each) when not searching.
  const groups = useMemo(() => {
    const byCategory = new Map<string, GlossaryTerm[]>();
    for (const t of terms) {
      const key = t.category?.trim() || 'Other';
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key)!.push(t);
    }
    return [...byCategory.entries()]
      .map(([category, items]) => ({
        category,
        items: [...items].sort((a, b) => a.term.localeCompare(b.term)),
      }))
      .sort((a, b) => (a.category === 'Other' ? 1 : b.category === 'Other' ? -1 : a.category.localeCompare(b.category)));
  }, [terms]);

  const resultCount = searchResults ? searchResults.length : terms.length;

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

          {!loading && loaded && resultCount === 0 && (
            <EmptyState
              icon={BookOpen}
              title={terms.length === 0 ? 'No glossary terms yet' : 'No terms match this search'}
              description={terms.length === 0 ? 'Defined terms will appear here as they are added.' : 'Try a different search term.'}
            />
          )}

          {loaded && resultCount > 0 && (
            searchResults ? (
              // Search: flat, relevance-ranked list.
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500">
                  {resultCount} {resultCount === 1 ? 'result' : 'results'}
                </p>
                <div className="space-y-3">
                  {searchResults.map((entry) => (
                    <TermCard key={entry.id} entry={entry} active={activeTerm === entry.slug} />
                  ))}
                </div>
              </div>
            ) : (
              // Browse: grouped by category.
              <div className="space-y-8">
                {groups.map((group) => (
                  <section key={group.category}>
                    <div className="mb-3 flex items-baseline gap-2 border-b border-slate-200 pb-2 dark:border-zinc-800">
                      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-zinc-200">{group.category}</h2>
                      <span className="text-xs text-slate-400 dark:text-zinc-500">{group.items.length}</span>
                    </div>
                    <div className="space-y-3">
                      {group.items.map((entry) => (
                        <TermCard key={entry.id} entry={entry} active={activeTerm === entry.slug} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )
          )}
      </>
    </div>
  );
}

function TermCard({ entry, active }: { entry: GlossaryTerm; active: boolean }) {
  return (
    <div
      id={`term-${entry.slug}`}
      className={`scroll-mt-24 rounded-2xl border bg-white p-4 shadow-sm transition-colors dark:bg-zinc-900/50 ${
        active
          ? 'border-emerald-400 ring-2 ring-emerald-400/40 dark:border-emerald-500'
          : 'border-slate-200 dark:border-zinc-800'
      }`}
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
        <GlossaryText skipSlug={entry.slug}>{entry.definition}</GlossaryText>
      </p>
    </div>
  );
}
