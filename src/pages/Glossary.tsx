import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Search, Tag, Target, X } from 'lucide-react';
import { supabase } from '../services/supabase/client';
import { listGlossaryTerms, GLOSSARY_TAGS, type GlossaryTerm } from '../services/glossary';
import { MOCK_GLOSSARY_TERMS } from '../data/mockGlossary';
import { GlossaryText } from '../components/GlossaryText';
import { EmptyState } from '../components/EmptyState';
import { usePageMeta } from '../hooks/usePageMeta';
import { scrollBehavior } from '../lib/motion';
import { cn } from '../lib/utils';

/**
 * Search-first glossary. Nobody browses A–Z, so the landing state is a
 * search box with three ways to narrow underneath: by category (what kind
 * of word), by tag (how it is used: slang, safety, lab report) and by
 * bearing (which goal it relates to). Search ranks within the active filter.
 * Deep links (?term=slug) open the term's full entry.
 */

type Filter = { kind: 'category' | 'tag' | 'bearing'; value: string } | null;

function matchesFilter(t: GlossaryTerm, f: Filter) {
  if (!f) return true;
  if (f.kind === 'category') return (t.category?.trim() || 'Other') === f.value;
  if (f.kind === 'tag') return t.tags.includes(f.value);
  return t.bearings.includes(f.value);
}

export default function Glossary() {
  usePageMeta('Glossary', 'Plain-language definitions for supplement and research terms.');
  const [terms, setTerms] = useState<GlossaryTerm[]>(() => (supabase ? [] : MOCK_GLOSSARY_TERMS));
  const [loading, setLoading] = useState(!!supabase);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>(null);
  const [browsingAll, setBrowsingAll] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTerm = searchParams.get('term');

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    listGlossaryTerms(supabase)
      .then((rows) => { if (!cancelled) setTerms(rows); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load the glossary.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // A deep-linked term shows on its own with its full entry open.
  const activeEntry = useMemo(() => (activeTerm ? terms.find((t) => t.slug === activeTerm) ?? null : null), [activeTerm, terms]);
  useEffect(() => {
    if (!activeEntry) return;
    document.getElementById(`term-${activeEntry.slug}`)?.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
  }, [activeEntry]);

  const counts = useMemo(() => {
    const categories = new Map<string, number>();
    const tags = new Map<string, number>();
    const bearings = new Map<string, number>();
    for (const t of terms) {
      const c = t.category?.trim() || 'Other';
      categories.set(c, (categories.get(c) ?? 0) + 1);
      for (const tag of t.tags) tags.set(tag, (tags.get(tag) ?? 0) + 1);
      for (const b of t.bearings) bearings.set(b, (bearings.get(b) ?? 0) + 1);
    }
    const sorted = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return { categories: sorted(categories), tags: sorted(tags), bearings: sorted(bearings) };
  }, [terms]);

  // Relevance: exact term, term starts with, term contains, definition contains.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = terms.filter((t) => matchesFilter(t, filter));
    if (!q) return pool.slice().sort((a, b) => a.term.localeCompare(b.term));
    return pool
      .map((t) => {
        const name = t.term.toLowerCase();
        const score = name === q ? 0 : name.startsWith(q) ? 1 : name.includes(q) ? 2 : t.definition.toLowerCase().includes(q) || (t.detail ?? '').toLowerCase().includes(q) ? 3 : -1;
        return { t, score };
      })
      .filter((r) => r.score >= 0)
      .sort((a, b) => a.score - b.score || a.t.term.localeCompare(b.t.term))
      .map((r) => r.t);
  }, [terms, query, filter]);

  const showingList = !!query.trim() || !!filter || browsingAll;

  const clearDeepLink = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('term');
    setSearchParams(next, { replace: true });
  };

  const chip = (active: boolean) =>
    cn(
      'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
      active
        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600',
    );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pb-12 pt-6">
      <Link to="/lab" className="flex w-fit items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200">
        <ArrowLeft size={16} /> Back to Lab
      </Link>

      <div>
        <h1 className="flex items-center gap-2 text-3xl font-black text-slate-900 dark:text-white">
          <BookOpen size={26} className="text-emerald-500" /> Glossary
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
          Short, plain definitions. Hover any underlined word across the site to see one.
        </p>
      </div>

      {activeEntry ? (
        <div className="space-y-4">
          <button type="button" onClick={clearDeepLink} className="flex w-fit items-center gap-1 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400">
            <ArrowLeft size={15} /> All terms
          </button>
          <TermCard entry={activeEntry} expanded onPick={(f) => { clearDeepLink(); setFilter(f); }} />
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a term, e.g. half-life, PCT, bioavailability"
              autoFocus
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
            />
          </div>

          {error && <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
          {loading && <p className="text-sm text-slate-500 dark:text-zinc-400">Loading glossary…</p>}

          {!loading && !showingList && (
            <div className="space-y-5">
              <FilterGroup icon={BookOpen} label="By kind of word" items={counts.categories} render={(v) => v} onPick={(v) => setFilter({ kind: 'category', value: v })} chip={chip} />
              {counts.tags.length > 0 && (
                <FilterGroup icon={Tag} label="By how it's used" items={counts.tags} render={(v) => GLOSSARY_TAGS[v as keyof typeof GLOSSARY_TAGS] ?? v} onPick={(v) => setFilter({ kind: 'tag', value: v })} chip={chip} />
              )}
              {counts.bearings.length > 0 && (
                <FilterGroup icon={Target} label="By goal" items={counts.bearings} render={(v) => v} onPick={(v) => setFilter({ kind: 'bearing', value: v })} chip={chip} />
              )}
              <button type="button" onClick={() => setBrowsingAll(true)} className="text-sm font-medium text-slate-500 hover:text-slate-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200">
                or browse all {terms.length} terms A–Z
              </button>
            </div>
          )}

          {!loading && showingList && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <button type="button" onClick={() => { setFilter(null); setBrowsingAll(false); setQuery(''); }} className="flex items-center gap-1 font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                  <ArrowLeft size={15} /> Start over
                </button>
                {filter && (
                  <span className={cn(chip(true), 'flex items-center gap-1')}>
                    {filter.kind === 'tag' ? (GLOSSARY_TAGS[filter.value as keyof typeof GLOSSARY_TAGS] ?? filter.value) : filter.value}
                    <button type="button" onClick={() => setFilter(null)} aria-label="Clear filter"><X size={12} /></button>
                  </span>
                )}
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                  {results.length} {results.length === 1 ? 'term' : 'terms'}
                </span>
              </div>
              {results.length === 0 ? (
                <EmptyState icon={BookOpen} title="No terms match" description="Try another spelling, or clear the filter." />
              ) : (
                <div className="space-y-3">
                  {results.map((entry) => (
                    <TermCard key={entry.id} entry={entry} onPick={setFilter} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FilterGroup({ icon: Icon, label, items, render, onPick, chip }: {
  icon: typeof BookOpen;
  label: string;
  items: [string, number][];
  render: (v: string) => string;
  onPick: (v: string) => void;
  chip: (active: boolean) => string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
        <Icon size={13} /> {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map(([value, n]) => (
          <button key={value} type="button" onClick={() => onPick(value)} className={chip(false)}>
            {render(value)} <span className="text-slate-500 dark:text-zinc-400">{n}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TermCard({ entry, expanded = false, onPick }: { entry: GlossaryTerm; expanded?: boolean; onPick: (f: Filter) => void }) {
  const [open, setOpen] = useState(expanded);
  const pill = 'rounded-full px-2 py-0.5 text-[11px] font-medium';
  return (
    <div
      id={`term-${entry.slug}`}
      className={cn(
        'scroll-mt-24 rounded-2xl border bg-white p-4 shadow-sm transition-colors dark:bg-zinc-900/50',
        expanded ? 'border-emerald-400 ring-2 ring-emerald-400/40 dark:border-emerald-500' : 'border-slate-200 dark:border-zinc-800',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold text-slate-900 dark:text-white">{entry.term}</h3>
        {entry.category && (
          <button type="button" onClick={() => onPick({ kind: 'category', value: entry.category! })} className={cn(pill, 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700')}>
            {entry.category}
          </button>
        )}
        {entry.tags.map((t) => (
          <button key={t} type="button" onClick={() => onPick({ kind: 'tag', value: t })} className={cn(pill, t === 'slang' ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' : t === 'safety' ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300')}>
            {GLOSSARY_TAGS[t as keyof typeof GLOSSARY_TAGS] ?? t}
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-300">
        <GlossaryText skipSlug={entry.slug}>{entry.definition}</GlossaryText>
      </p>
      {entry.detail && (
        open ? (
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-300">
            <GlossaryText skipSlug={entry.slug}>{entry.detail}</GlossaryText>
          </p>
        ) : (
          <button type="button" onClick={() => setOpen(true)} className="mt-2 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
            More detail
          </button>
        )
      )}
      {entry.bearings.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Target size={12} className="text-slate-400 dark:text-zinc-500" />
          {entry.bearings.map((b) => (
            <button key={b} type="button" onClick={() => onPick({ kind: 'bearing', value: b })} className={cn(pill, 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20')}>
              {b}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
