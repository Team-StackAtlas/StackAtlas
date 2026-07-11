import { useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { listSourceLibrary, RESEARCH_SOURCE_TYPES_V1, type SourceLibraryEntry } from '../../services/import';
import Badge from './Badge';
import { sourceTypeLabel } from './adminLabels';

export default function SourceLibrary({ client }: { client: SupabaseClient | null }) {
  const [entries, setEntries] = useState<SourceLibraryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const load = async () => {
    if (!client) return;
    setLoading(true);
    setError('');
    try {
      setEntries(await listSourceLibrary(client));
      setLoaded(true);
    } catch (err) {
      console.error('Load source library failed', err);
      setError(err instanceof Error ? err.message : 'Failed to load the source library.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (typeFilter && entry.sourceType !== typeFilter) return false;
      if (!q) return true;
      return [entry.title, entry.pmid, entry.doi, entry.journalOrSite, ...entry.substances.map((s) => s.name)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [entries, search, typeFilter]);

  if (!client) {
    return (
      <Empty text="Backend not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to browse the source library." />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-600 dark:text-zinc-400">
          {loaded ? `${filtered.length} of ${entries.length} source${entries.length === 1 ? '' : 's'}` : 'Source Library'}
        </h2>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold disabled:opacity-50 dark:bg-zinc-800"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, PMID, DOI, journal, or substance"
          className="min-w-[240px] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        >
          <option value="">All types</option>
          {RESEARCH_SOURCE_TYPES_V1.map((type) => (
            <option key={type} value={type}>
              {sourceTypeLabel(type)}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <span>{error}</span>
          <button
            onClick={() => void load()}
            className="shrink-0 rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold dark:bg-red-500/20"
          >
            Retry
          </button>
        </div>
      )}

      {loading && !loaded && (
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-zinc-950">
          <Loader2 size={16} className="animate-spin" />
          Loading source records…
        </div>
      )}

      {!loading && loaded && filtered.length === 0 && (
        <Empty
          text={
            entries.length === 0
              ? 'No source records yet. Import sources from the Import tab.'
              : 'No sources match this search.'
          }
        />
      )}

      <div className="space-y-2">
        {filtered.map((entry) => (
          <div
            key={entry.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">
                  {entry.title}
                  {entry.url && (
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-1.5 inline-block align-middle text-emerald-700 dark:text-emerald-400"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {[entry.journalOrSite, entry.year, entry.authors].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <Badge tone="blue">{sourceTypeLabel(entry.sourceType)}</Badge>
            </div>
            {entry.substances.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {entry.substances.map((s) => (
                  <Badge key={s.id} tone="slate">
                    {s.name}
                  </Badge>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-slate-400">
              {[entry.pmid && `PMID ${entry.pmid}`, entry.doi && `DOI ${entry.doi}`]
                .filter(Boolean)
                .join(' · ') || 'No PMID or DOI'}
              {' · Added '}
              {new Date(entry.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-zinc-950">{text}</p>
  );
}
