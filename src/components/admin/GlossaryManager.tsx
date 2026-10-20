import { useEffect, useState, type ReactNode } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { deleteGlossaryTerm, listGlossaryTerms, upsertGlossaryTerm, GLOSSARY_TAGS, type GlossaryTerm } from '../../services/glossary';
import { BEARINGS } from '../../data/mockData';

type Draft = {
  term: string;
  definition: string;
  category: string;
  detail: string;
  tags: string[];
  bearings: string[];
};

const EMPTY_DRAFT: Draft = { term: '', definition: '', category: '', detail: '', tags: [], bearings: [] };

function draftFromEntry(entry: GlossaryTerm): Draft {
  return {
    term: entry.term,
    definition: entry.definition,
    category: entry.category ?? '',
    detail: entry.detail ?? '',
    tags: entry.tags,
    bearings: entry.bearings,
  };
}

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function GlossaryManager({
  client,
  isAdmin,
}: {
  client: SupabaseClient | null;
  isAdmin: boolean;
}) {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const [newDraft, setNewDraft] = useState<Draft>(EMPTY_DRAFT);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const load = async () => {
    if (!client) return;
    setLoading(true);
    setError('');
    try {
      setTerms(await listGlossaryTerms(client));
      setLoaded(true);
    } catch (err) {
      console.error('Load glossary failed', err);
      setError(err instanceof Error ? err.message : 'Failed to load the glossary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  const startEdit = (entry: GlossaryTerm) => {
    setEditingId(entry.id);
    setDraft(draftFromEntry(entry));
    setSaveError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
    setSaveError('');
  };

  const addTerm = async () => {
    if (!client) return;
    const term = newDraft.term.trim();
    const definition = newDraft.definition.trim();
    if (!term || !definition) {
      setAddError('Term and definition are required.');
      return;
    }
    setAdding(true);
    setAddError('');
    try {
      await upsertGlossaryTerm(client, {
        term,
        definition,
        category: newDraft.category.trim() || null,
        detail: newDraft.detail.trim() || null,
        tags: newDraft.tags,
        bearings: newDraft.bearings,
      });
      setNewDraft(EMPTY_DRAFT);
      await load();
    } catch (err) {
      console.error('Add glossary term failed', err);
      setAddError(err instanceof Error ? err.message : 'Failed to add the term.');
    } finally {
      setAdding(false);
    }
  };

  const saveEdit = async (entry: GlossaryTerm) => {
    if (!client || !draft) return;
    const term = draft.term.trim();
    const definition = draft.definition.trim();
    if (!term || !definition) {
      setSaveError('Term and definition are required.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      await upsertGlossaryTerm(client, {
        term,
        definition,
        category: draft.category.trim() || null,
        slug: entry.slug,
        detail: draft.detail.trim() || null,
        tags: draft.tags,
        bearings: draft.bearings,
      });
      await load();
      cancelEdit();
    } catch (err) {
      console.error('Edit glossary term failed', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const removeTerm = async (entry: GlossaryTerm) => {
    if (!client) return;
    if (!window.confirm(`Delete "${entry.term}"? This cannot be undone.`)) return;
    try {
      await deleteGlossaryTerm(client, entry.id);
      await load();
    } catch (err) {
      console.error('Delete glossary term failed', err);
      setError(err instanceof Error ? err.message : 'Failed to delete the term.');
    }
  };

  if (!client) {
    return <Empty text="Backend not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to manage the glossary." />;
  }

  if (!isAdmin) {
    return <Empty text="You do not have access to manage the glossary." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-600 dark:text-zinc-400">
          {loaded ? `${terms.length} term${terms.length === 1 ? '' : 's'}` : 'Glossary'}
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

      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-zinc-700 dark:bg-zinc-950">
        {addError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {addError}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Term">
            <input
              value={newDraft.term}
              onChange={(e) => setNewDraft({ ...newDraft, term: e.target.value })}
              className={fieldInputClass}
            />
          </Field>
          <Field label="Category (optional)">
            <input
              value={newDraft.category}
              onChange={(e) => setNewDraft({ ...newDraft, category: e.target.value })}
              className={fieldInputClass}
            />
          </Field>
        </div>
        <Field label="Definition (1–2 sentences; this is the tooltip)">
          <textarea
            value={newDraft.definition}
            onChange={(e) => setNewDraft({ ...newDraft, definition: e.target.value })}
            rows={2}
            className={fieldInputClass}
          />
        </Field>
        <Field label="Detail (optional longer paragraph, full entry only)">
          <textarea
            value={newDraft.detail}
            onChange={(e) => setNewDraft({ ...newDraft, detail: e.target.value })}
            rows={3}
            className={fieldInputClass}
          />
        </Field>
        <TagAndBearingPickers draft={newDraft} onChange={setNewDraft} />
        <button
          onClick={() => void addTerm()}
          disabled={adding}
          className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800 disabled:opacity-50 dark:bg-emerald-500/15 dark:text-emerald-300"
        >
          {adding ? 'Adding…' : 'Add term'}
        </button>
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
          Loading glossary terms…
        </div>
      )}

      {!loading && loaded && terms.length === 0 && <Empty text="No glossary terms yet. Add one above." />}

      <div className="space-y-2">
        {terms.map((entry) => (
          <div
            key={entry.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">{entry.term}</p>
                <p className="mt-0.5 text-xs text-slate-500">{entry.slug}</p>
              </div>
              {entry.category && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {entry.category}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-zinc-300">{entry.definition}</p>
            {(entry.tags.length > 0 || entry.bearings.length > 0) && (
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                {entry.tags.map((t) => `#${t}`).join(' ')}{entry.tags.length && entry.bearings.length ? ' · ' : ''}{entry.bearings.join(', ')}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => (editingId === entry.id ? cancelEdit() : startEdit(entry))}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {editingId === entry.id ? 'Close' : 'Edit'}
              </button>
              <button
                onClick={() => void removeTerm(entry)}
                className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300"
              >
                <Trash2 size={13} />
                Delete
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
                  <Field label="Term">
                    <input
                      value={draft.term}
                      onChange={(e) => setDraft({ ...draft, term: e.target.value })}
                      className={fieldInputClass}
                    />
                  </Field>
                  <Field label="Category">
                    <input
                      value={draft.category}
                      onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                      className={fieldInputClass}
                    />
                  </Field>
                </div>
                <Field label="Definition (1–2 sentences; this is the tooltip)">
                  <textarea
                    value={draft.definition}
                    onChange={(e) => setDraft({ ...draft, definition: e.target.value })}
                    rows={2}
                    className={fieldInputClass}
                  />
                </Field>
                <Field label="Detail (optional longer paragraph, full entry only)">
                  <textarea
                    value={draft.detail}
                    onChange={(e) => setDraft({ ...draft, detail: e.target.value })}
                    rows={3}
                    className={fieldInputClass}
                  />
                </Field>
                <TagAndBearingPickers draft={draft} onChange={setDraft} />
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

function TagAndBearingPickers({ draft, onChange }: { draft: Draft; onChange: (d: Draft) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-zinc-400">Tags (how the word is used)</span>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(GLOSSARY_TAGS).map(([value, label]) => (
            <button key={value} type="button" onClick={() => onChange({ ...draft, tags: toggle(draft.tags, value) })} aria-pressed={draft.tags.includes(value)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${draft.tags.includes(value) ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' : 'border-slate-200 text-slate-600 dark:border-zinc-700 dark:text-zinc-300'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-zinc-400">Bearings ({draft.bearings.length}/5)</span>
        <div className="flex flex-wrap gap-1.5">
          {BEARINGS.map((b) => {
            const on = draft.bearings.includes(b);
            const full = !on && draft.bearings.length >= 5;
            return (
              <button key={b} type="button" disabled={full} onClick={() => onChange({ ...draft, bearings: toggle(draft.bearings, b) })} aria-pressed={on}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium disabled:opacity-40 ${on ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' : 'border-slate-200 text-slate-600 dark:border-zinc-700 dark:text-zinc-300'}`}>
                {b}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-zinc-950">{text}</p>;
}
