import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import {
  editSource,
  listSourceLibrary,
  RESEARCH_SOURCE_TYPES_V1,
  type SourceEditPatch,
  type SourceLibraryEntry,
} from '../../services/import';
import Badge from './Badge';
import { sourceTypeLabel } from './adminLabels';

type EditDraft = {
  title: string;
  url: string;
  pmid: string;
  doi: string;
  year: string;
  journalOrSite: string;
  authors: string;
  abstract: string;
  sourceType: string;
};

function draftFromEntry(entry: SourceLibraryEntry): EditDraft {
  return {
    title: entry.title ?? '',
    url: entry.url ?? '',
    pmid: entry.pmid ?? '',
    doi: entry.doi ?? '',
    year: entry.year != null ? String(entry.year) : '',
    journalOrSite: entry.journalOrSite ?? '',
    authors: entry.authors ?? '',
    abstract: entry.abstract ?? '',
    sourceType: entry.sourceType,
  };
}

export default function SourceLibrary({ client }: { client: SupabaseClient | null }) {
  const [entries, setEntries] = useState<SourceLibraryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

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

  const startEdit = (entry: SourceLibraryEntry) => {
    setEditingId(entry.id);
    setDraft(draftFromEntry(entry));
    setSaveError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
    setSaveError('');
  };

  const saveEdit = async (entry: SourceLibraryEntry) => {
    if (!client || !draft) return;
    const trim = (v: string) => v.trim();
    const patch: SourceEditPatch = {};
    if (trim(draft.title) !== (entry.title ?? '').trim()) patch.title = trim(draft.title);
    if (trim(draft.url) !== (entry.url ?? '').trim()) patch.url = trim(draft.url) || null;
    if (trim(draft.pmid) !== (entry.pmid ?? '').trim()) patch.pmid = trim(draft.pmid) || null;
    if (trim(draft.doi) !== (entry.doi ?? '').trim()) patch.doi = trim(draft.doi) || null;
    const originalYear = entry.year != null ? String(entry.year) : '';
    if (trim(draft.year) !== originalYear) {
      const y = trim(draft.year);
      patch.year = y === '' ? null : Number(y);
    }
    if (trim(draft.journalOrSite) !== (entry.journalOrSite ?? '').trim()) {
      patch.journalOrSite = trim(draft.journalOrSite) || null;
    }
    if (trim(draft.authors) !== (entry.authors ?? '').trim()) patch.authors = trim(draft.authors) || null;
    if (trim(draft.abstract) !== (entry.abstract ?? '').trim()) patch.abstract = trim(draft.abstract) || null;
    if (draft.sourceType !== entry.sourceType) patch.sourceType = draft.sourceType;

    if (Object.keys(patch).length === 0) {
      cancelEdit();
      return;
    }

    setSaving(true);
    setSaveError('');
    try {
      await editSource(client, entry.id, patch);
      await load();
      cancelEdit();
    } catch (err) {
      console.error('Edit source failed', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

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

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => (editingId === entry.id ? cancelEdit() : startEdit(entry))}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {editingId === entry.id ? 'Close' : 'Edit'}
              </button>
            </div>

            {editingId === entry.id && draft && (
              <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-zinc-700 dark:bg-zinc-950">
                {saveError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                    {saveError}
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Title">
                    <input
                      value={draft.title}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                      className={fieldInputClass}
                    />
                  </Field>
                  <Field label="Source type">
                    <select
                      value={draft.sourceType}
                      onChange={(e) => setDraft({ ...draft, sourceType: e.target.value })}
                      className={fieldInputClass}
                    >
                      {RESEARCH_SOURCE_TYPES_V1.map((type) => (
                        <option key={type} value={type}>
                          {sourceTypeLabel(type)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="URL">
                    <input
                      value={draft.url}
                      onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                      className={fieldInputClass}
                    />
                  </Field>
                  <Field label="Year">
                    <input
                      value={draft.year}
                      onChange={(e) => setDraft({ ...draft, year: e.target.value })}
                      className={fieldInputClass}
                    />
                  </Field>
                  <Field label="PMID">
                    <input
                      value={draft.pmid}
                      onChange={(e) => setDraft({ ...draft, pmid: e.target.value })}
                      className={fieldInputClass}
                    />
                  </Field>
                  <Field label="DOI">
                    <input
                      value={draft.doi}
                      onChange={(e) => setDraft({ ...draft, doi: e.target.value })}
                      className={fieldInputClass}
                    />
                  </Field>
                  <Field label="Journal / site">
                    <input
                      value={draft.journalOrSite}
                      onChange={(e) => setDraft({ ...draft, journalOrSite: e.target.value })}
                      className={fieldInputClass}
                    />
                  </Field>
                  <Field label="Authors">
                    <input
                      value={draft.authors}
                      onChange={(e) => setDraft({ ...draft, authors: e.target.value })}
                      className={fieldInputClass}
                    />
                  </Field>
                </div>
                <Field label="Abstract">
                  <textarea
                    value={draft.abstract}
                    onChange={(e) => setDraft({ ...draft, abstract: e.target.value })}
                    rows={3}
                    className={fieldInputClass}
                  />
                </Field>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void saveEdit(entry)}
                    disabled={saving}
                    className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800 disabled:opacity-50 dark:bg-emerald-500/15 dark:text-emerald-300"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    disabled={saving}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    Cancel
                  </button>
                  {saving && <Loader2 size={14} className="animate-spin" />}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const fieldInputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-zinc-950">{text}</p>
  );
}
