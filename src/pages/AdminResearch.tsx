import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase/client';
import {
  addSingleResearchSource,
  blankSourceForm,
  clean,
  importSourceRows,
  normalizeSourceType,
  parseSourceCsv,
  sourceTypeOptions,
  toImportRow,
  typeLabel,
} from '../services/research/sourceImport';
import type {
  PreviewRow,
  SourceForm,
  SourceLibraryRow,
  SubstanceOption,
} from '../services/research/types';
import type { ProfileDTO, SessionUser } from '../services/types';

function isAdmin(profile: ProfileDTO | null) {
  return profile?.siteRole === 'site_admin' || profile?.siteRole === 'site_owner';
}
function isOwner(profile: ProfileDTO | null) {
  return profile?.siteRole === 'site_owner';
}
function normalizeTitle(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}
function validYear(value: string) {
  return !value || /^\d{4}$/.test(value);
}

export default function AdminResearch({
  profile,
}: {
  profile: ProfileDTO | null;
  user: SessionUser | null;
}) {
  const [substances, setSubstances] = useState<SubstanceOption[]>([]);
  const [sources, setSources] = useState<SourceLibraryRow[]>([]);
  const [substancesLoading, setSubstancesLoading] = useState(false);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [substancesError, setSubstancesError] = useState('');
  const [sourcesError, setSourcesError] = useState('');
  const [importError, setImportError] = useState('');
  const [singleError, setSingleError] = useState('');
  const [summary, setSummary] = useState('');
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [form, setForm] = useState<SourceForm>(blankSourceForm);
  const [filters, setFilters] = useState({ substanceId: '', sourceType: '', search: '' });
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const allowed = isAdmin(profile);
  const owner = isOwner(profile);

  const loadSubstances = async () => {
    if (!supabase || !allowed) return;
    setSubstancesLoading(true);
    setSubstancesError('');
    const result = await supabase.from('substances').select('id,name,slug').order('name');
    setSubstancesLoading(false);
    if (result.error) {
      console.error('Research substances load failed', result.error);
      setSubstancesError('Substances failed to load. Substance validation is unavailable.');
      return;
    }
    setSubstances((result.data ?? []) as SubstanceOption[]);
  };
  const loadSources = async () => {
    if (!supabase || !allowed) return;
    setSourcesLoading(true);
    setSourcesError('');
    const result = await supabase
      .from('research_sources')
      .select(
        'id,title,url,pmid,doi,year,journal_or_site,authors,abstract,source_type,created_at,research_source_substances(notes,substances(id,name,slug))',
      )
      .order('created_at', { ascending: false });
    setSourcesLoading(false);
    if (result.error) {
      console.error('Research source library load failed', result.error);
      setSourcesError('Failed to load research sources.');
      return;
    }
    setSources((result.data ?? []) as unknown as SourceLibraryRow[]);
  };
  useEffect(() => {
    void loadSubstances();
    void loadSources();
  }, [allowed]);

  const parse = () => {
    setImportError('');
    setSummary('');
    if (substancesError || !substances.length) {
      setImportError(
        substancesError || 'Substances are still loading. Try parsing again after they load.',
      );
      return;
    }
    const result = parseSourceCsv(csv, substances, sources);
    setPreview(result.rows);
    if (!result.ok) setImportError(result.error);
    else setSummary(`Parsed ${result.rows.length} row${result.rows.length === 1 ? '' : 's'}.`);
  };
  const saveRows = async () => {
    if (!supabase || importing) return;
    setImporting(true);
    setImportError('');
    setSummary('');
    try {
      const ready = preview
        .filter((row) => row.status === 'Ready' && row.normalizedType)
        .map((row) => toImportRow(row, row.normalizedType!));
      const result = await importSourceRows(supabase, ready);
      setSummary(
        `Imported ${result.imported_count}; reused ${result.reused_count}; linked ${result.linked_count}; skipped ${result.skipped_count}. Batch ${result.batch_id}.`,
      );
      setPreview([]);
      setCsv('');
      await loadSources();
    } catch (err) {
      console.error('Bulk research import failed', err);
      setImportError(err instanceof Error ? err.message : 'Bulk import failed.');
    } finally {
      setImporting(false);
    }
  };
  const saveSingle = async () => {
    if (!supabase || saving) return;
    setSaving(true);
    setSingleError('');
    setSummary('');
    try {
      const normalizedType = normalizeSourceType(form.sourceType);
      if (!form.substanceId) throw new Error('Choose a substance before saving.');
      if (!form.title.trim()) throw new Error('Add a title before saving.');
      if (!normalizedType) throw new Error('Choose a source type before saving.');
      if (!validYear(form.year)) throw new Error('Use a four-digit year or leave year blank.');
      const found = sources.find(
        (source) =>
          (form.pmid && source.pmid === form.pmid) ||
          (form.doi && source.doi === form.doi) ||
          (form.url && source.url === form.url) ||
          (normalizeTitle(source.title) === normalizeTitle(form.title) &&
            source.research_source_substances?.some(
              (link) => link.substances?.id === form.substanceId,
            )),
      );
      if (found)
        throw new Error(
          'Possible duplicate found. Check the Source Library before adding this source.',
        );
      const result = await addSingleResearchSource(supabase, toImportRow(form, normalizedType));
      setForm(blankSourceForm);
      setSummary(
        `Source saved. ${result.source_created ? 'Created a new source' : 'Reused an existing source'} and ${result.link_created ? 'added a substance link' : 'reused the existing link'}.`,
      );
      await loadSources();
    } catch (err) {
      console.error('Single research source save failed', err);
      setSingleError(err instanceof Error ? err.message : 'Source save failed.');
    } finally {
      setSaving(false);
    }
  };
  const filtered = useMemo(
    () =>
      sources.filter(
        (source) =>
          (!filters.substanceId ||
            source.research_source_substances?.some(
              (link) => link.substances?.id === filters.substanceId,
            )) &&
          (!filters.sourceType || source.source_type === filters.sourceType) &&
          (!filters.search ||
            [source.title, source.pmid, source.doi].some((value) =>
              clean(value).toLowerCase().includes(filters.search.toLowerCase()),
            )),
      ),
    [sources, filters],
  );

  if (!allowed)
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        You do not have access to Admin Research.
      </div>
    );
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-3xl font-black">Research</h1>
        <p className="text-sm text-slate-500">
          Import and manage unreviewed source records for StackAtlas.
        </p>
      </div>
      {summary && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {summary}
        </div>
      )}
      {owner && (
        <OwnerImport
          csv={csv}
          setCsv={setCsv}
          preview={preview}
          parse={parse}
          save={saveRows}
          error={importError}
          disabled={substancesLoading || !!substancesError || importing}
          importing={importing}
        />
      )}
      <AddSingle
        form={form}
        setForm={setForm}
        substances={substances}
        save={saveSingle}
        error={singleError || substancesError}
        saving={saving}
        disabled={substancesLoading || !!substancesError}
      />
      <Library
        filters={filters}
        setFilters={setFilters}
        substances={substances}
        sources={filtered}
        loading={sourcesLoading}
        error={sourcesError}
      />
    </section>
  );
}

function OwnerImport({
  csv,
  setCsv,
  preview,
  parse,
  save,
  error,
  disabled,
  importing,
}: {
  csv: string;
  setCsv: (v: string) => void;
  preview: PreviewRow[];
  parse: () => void;
  save: () => void;
  error: string;
  disabled: boolean;
  importing: boolean;
}) {
  const ready = preview.filter((row) => row.status === 'Ready').length;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-xl font-bold">Owner Bulk Import</h2>
      <p className="text-sm text-slate-500">
        site_owner only. Paste CSV with required columns: substance, source_type, title.
      </p>
      {error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <textarea
        className="mt-3 h-44 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950"
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        placeholder="substance,source_type,title,url,pmid,doi,year,journal_or_site,authors,abstract,notes"
      />
      <div className="mt-3 flex gap-2">
        <button
          onClick={parse}
          disabled={disabled}
          className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
        >
          Parse
        </button>
        <button
          onClick={save}
          disabled={!ready || importing}
          className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          {importing ? 'Importing…' : 'Import Ready Rows'}
        </button>
      </div>
      {preview.length > 0 && <Preview rows={preview} />}
    </section>
  );
}
function AddSingle({
  form,
  setForm,
  substances,
  save,
  error,
  saving,
  disabled,
}: {
  form: SourceForm;
  setForm: (f: SourceForm) => void;
  substances: SubstanceOption[];
  save: () => void;
  error: string;
  saving: boolean;
  disabled: boolean;
}) {
  const set = (key: keyof SourceForm, value: string) => setForm({ ...form, [key]: value });
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-xl font-bold">Add Single Source</h2>
      <p className="text-sm text-slate-500">
        Save one useful article, label, COA, vendor document, or other source.
      </p>
      {error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Select
          value={form.substanceId}
          onChange={(v) => set('substanceId', v)}
          options={substances.map((s) => [s.id, s.name])}
          label="Substance"
        />
        <Select
          value={form.sourceType}
          onChange={(v) => set('sourceType', v)}
          options={sourceTypeOptions.map((o) => [o.value, o.label])}
          label="Source Type"
        />
        {(
          ['title', 'url', 'pmid', 'doi', 'year', 'journalOrSite', 'notes'] as (keyof SourceForm)[]
        ).map((key) => (
          <input
            key={key}
            className="rounded-xl border px-3 py-2 dark:bg-zinc-950"
            placeholder={
              key === 'journalOrSite' ? 'Journal / Site' : key[0].toUpperCase() + key.slice(1)
            }
            value={form[key]}
            onChange={(e) => set(key, e.target.value)}
          />
        ))}
      </div>
      <button
        onClick={save}
        disabled={saving || disabled}
        className="mt-3 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save Source'}
      </button>
    </section>
  );
}
function Library({
  filters,
  setFilters,
  substances,
  sources,
  loading,
  error,
}: {
  filters: { substanceId: string; sourceType: string; search: string };
  setFilters: (f: { substanceId: string; sourceType: string; search: string }) => void;
  substances: SubstanceOption[];
  sources: SourceLibraryRow[];
  loading: boolean;
  error: string;
}) {
  const set = (key: keyof typeof filters, value: string) =>
    setFilters({ ...filters, [key]: value });
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-xl font-bold">Source Library</h2>
      {error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="my-3 flex flex-wrap gap-2">
        <Select
          value={filters.substanceId}
          onChange={(v) => set('substanceId', v)}
          options={substances.map((s) => [s.id, s.name])}
          label="Substance"
        />
        <Select
          value={filters.sourceType}
          onChange={(v) => set('sourceType', v)}
          options={sourceTypeOptions.map((o) => [o.value, o.label])}
          label="Source Type"
        />
        <input
          value={filters.search}
          onChange={(e) => set('search', e.target.value)}
          className="rounded-xl border px-3 py-2 dark:bg-zinc-950"
          placeholder="Search title, PMID, or DOI"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-500">
              {[
                'Substance',
                'Title',
                'Type',
                'Year',
                'Journal / Site',
                'PMID / DOI',
                'Added',
                'Actions',
              ].map((h) => (
                <th className="px-3 py-2" key={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr className="border-t dark:border-zinc-800" key={source.id}>
                <td className="px-3 py-3">
                  {source.research_source_substances
                    ?.map((link) => link.substances?.name)
                    .filter(Boolean)
                    .join(', ') || '—'}
                </td>
                <td className="max-w-sm px-3 py-3 font-semibold">{source.title}</td>
                <td className="px-3 py-3">{typeLabel(source.source_type)}</td>
                <td className="px-3 py-3">{source.year ?? '—'}</td>
                <td className="px-3 py-3">{source.journal_or_site || '—'}</td>
                <td className="px-3 py-3">
                  {[source.pmid && `PMID ${source.pmid}`, source.doi && `DOI ${source.doi}`]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </td>
                <td className="px-3 py-3">{new Date(source.created_at).toLocaleDateString()}</td>
                <td className="px-3 py-3">
                  {source.url ? (
                    <a
                      className="font-semibold text-emerald-700"
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
            {sources.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-slate-500">
                  {loading
                    ? 'Loading source records…'
                    : 'No source records yet. Add one source or ask the site owner to import a CSV batch.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function Preview({ rows }: { rows: PreviewRow[] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-slate-500">
            {['Row', 'Status', 'Substance', 'Title', 'Type', 'PMID', 'DOI', 'URL'].map((h) => (
              <th key={h} className="px-3 py-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.rowNumber} className="border-t dark:border-zinc-800">
              <td className="px-3 py-2">{row.rowNumber}</td>
              <td
                className={`px-3 py-2 font-semibold ${row.status === 'Ready' ? 'text-emerald-700' : row.status === 'Possible Duplicate' ? 'text-amber-700' : 'text-red-700'}`}
              >
                {row.status}
              </td>
              <td className="px-3 py-2">{row.submittedSubstance || '—'}</td>
              <td className="px-3 py-2">{row.title || '—'}</td>
              <td className="px-3 py-2">
                {row.normalizedType ? typeLabel(row.normalizedType) : row.sourceType || '—'}
              </td>
              <td className="px-3 py-2">{row.pmid || '—'}</td>
              <td className="px-3 py-2">{row.doi || '—'}</td>
              <td className="px-3 py-2">{row.url || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[][];
  label: string;
}) {
  return (
    <select
      className="rounded-xl border px-3 py-2 dark:bg-zinc-950"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{label}</option>
      {options.map(([value, label]) => (
        <option value={value} key={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
