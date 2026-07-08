import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase/client';
import type { ProfileDTO, SessionUser } from '../services/types';

type SourceType =
  | 'human_study'
  | 'review_or_meta_analysis'
  | 'animal_study'
  | 'in_vitro_or_mechanistic'
  | 'official_label_or_document'
  | 'brand_or_vendor_document'
  | 'coa_or_testing_document'
  | 'practitioner_source'
  | 'community_or_influencer_mention'
  | 'other';
type Substance = { id: string; name: string };
type Source = {
  id: string;
  title: string;
  url: string | null;
  pmid: string | null;
  doi: string | null;
  year: number | null;
  journal_or_site: string | null;
  authors?: string | null;
  abstract?: string | null;
  source_type: SourceType;
  created_at: string;
  research_source_substances?: { notes: string | null; substances: Substance | null }[];
};
type Form = {
  substanceId: string;
  title: string;
  sourceType: string;
  url: string;
  pmid: string;
  doi: string;
  year: string;
  journalOrSite: string;
  authors: string;
  abstract: string;
  notes: string;
};
type PreviewRow = Form & {
  rowNumber: number;
  status:
    | 'Ready'
    | 'Possible Duplicate'
    | 'Missing Substance'
    | 'Unknown Substance'
    | 'Missing Title'
    | 'Invalid Source Type';
  normalizedType?: SourceType;
  duplicateReason?: string;
};

const sourceTypeOptions: { value: SourceType; label: string }[] = [
  { value: 'human_study', label: 'Human Study' },
  { value: 'review_or_meta_analysis', label: 'Review or Meta-analysis' },
  { value: 'animal_study', label: 'Animal Study' },
  { value: 'in_vitro_or_mechanistic', label: 'In vitro or Mechanistic' },
  { value: 'official_label_or_document', label: 'Official Label or Document' },
  { value: 'brand_or_vendor_document', label: 'Brand or Vendor Document' },
  { value: 'coa_or_testing_document', label: 'COA or Testing Document' },
  { value: 'practitioner_source', label: 'Practitioner Source' },
  { value: 'community_or_influencer_mention', label: 'Community or Influencer Mention' },
  { value: 'other', label: 'Other' },
];

const blankForm: Form = {
  substanceId: '',
  title: '',
  sourceType: '',
  url: '',
  pmid: '',
  doi: '',
  year: '',
  journalOrSite: '',
  authors: '',
  abstract: '',
  notes: '',
};

function isAdmin(profile: ProfileDTO | null) {
  return profile?.siteRole === 'site_admin' || profile?.siteRole === 'site_owner';
}
function isOwner(profile: ProfileDTO | null) {
  return profile?.siteRole === 'site_owner';
}
function clean(value: unknown) {
  return String(value ?? '').trim();
}
function normalizeTitle(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}
function typeLabel(value?: string | null) {
  return sourceTypeOptions.find((option) => option.value === value)?.label ?? 'Other';
}
function normalizeSourceType(value: string): SourceType | null {
  const key = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  const map: Record<string, SourceType> = {
    human_study: 'human_study',
    human_rct: 'human_study',
    review: 'review_or_meta_analysis',
    meta_analysis: 'review_or_meta_analysis',
    animal_study: 'animal_study',
    in_vitro: 'in_vitro_or_mechanistic',
    mechanistic: 'in_vitro_or_mechanistic',
    official_label: 'official_label_or_document',
    government_document: 'official_label_or_document',
    vendor_document: 'brand_or_vendor_document',
    coa: 'coa_or_testing_document',
    testing_document: 'coa_or_testing_document',
    practitioner_source: 'practitioner_source',
    influencer_mention: 'community_or_influencer_mention',
    other: 'other',
  };
  return (
    map[key] ??
    (sourceTypeOptions.some((option) => option.value === key) ? (key as SourceType) : null)
  );
}
function parseCsv(text: string) {
  const rows: string[][] = [];
  let cell = '',
    row: string[] = [],
    quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i],
      next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export default function AdminResearch({
  profile,
  user,
}: {
  profile: ProfileDTO | null;
  user: SessionUser | null;
}) {
  const [substances, setSubstances] = useState<Substance[]>([]),
    [sources, setSources] = useState<Source[]>([]);
  const [message, setMessage] = useState(''),
    [csv, setCsv] = useState(''),
    [preview, setPreview] = useState<PreviewRow[]>([]),
    [summary, setSummary] = useState('');
  const [form, setForm] = useState<Form>(blankForm),
    [filters, setFilters] = useState({ substanceId: '', sourceType: '', search: '' });
  const allowed = isAdmin(profile),
    owner = isOwner(profile);

  const load = async () => {
    if (!supabase || !allowed) return;
    setMessage('');
    const [subs, sourceRows] = await Promise.all([
      supabase.from('substances').select('id,name').order('name'),
      supabase
        .from('research_sources')
        .select(
          'id,title,url,pmid,doi,year,journal_or_site,authors,abstract,source_type,created_at,research_source_substances(notes,substances(id,name))',
        )
        .order('created_at', { ascending: false }),
    ]);
    if (subs.error) throw subs.error;
    if (sourceRows.error) throw sourceRows.error;
    setSubstances((subs.data ?? []) as Substance[]);
    setSources((sourceRows.data ?? []) as unknown as Source[]);
  };
  useEffect(() => {
    load().catch((e) =>
      setMessage(e instanceof Error ? e.message : 'Failed to load research sources.'),
    );
  }, [allowed]);

  const substanceByName = useMemo(
    () => new Map(substances.map((s) => [s.name.toLowerCase(), s])),
    [substances],
  );
  const isDuplicate = (row: Form) => {
    const title = normalizeTitle(row.title);
    return sources.find(
      (source) =>
        (row.pmid && source.pmid === row.pmid) ||
        (row.doi && source.doi === row.doi) ||
        (row.url && source.url === row.url) ||
        (title &&
          normalizeTitle(source.title) === title &&
          source.research_source_substances?.some(
            (link) => link.substances?.id === row.substanceId,
          )),
    );
  };
  const buildPreview = () => {
    const rows = parseCsv(csv);
    const header = rows.shift()?.map((h) => h.trim().toLowerCase()) ?? [];
    const seen = {
      pmids: new Set<string>(),
      dois: new Set<string>(),
      urls: new Set<string>(),
      titleSubstances: new Set<string>(),
    };
    const next = rows.map((values, index) => {
      const get = (name: string) => clean(values[header.indexOf(name)]);
      const substanceName = get('substance');
      const type = normalizeSourceType(get('source_type'));
      const substance = substanceName ? substanceByName.get(substanceName.toLowerCase()) : null;
      const row: PreviewRow = {
        ...blankForm,
        rowNumber: index + 2,
        substanceId: substance?.id ?? '',
        title: get('title'),
        sourceType: get('source_type'),
        normalizedType: type ?? undefined,
        url: get('url'),
        pmid: get('pmid'),
        doi: get('doi'),
        year: get('year'),
        journalOrSite: get('journal_or_site'),
        authors: get('authors'),
        abstract: get('abstract'),
        notes: get('notes'),
        status: 'Ready',
      };
      if (!substanceName) row.status = 'Missing Substance';
      else if (!substance) row.status = 'Unknown Substance';
      else if (!row.title) row.status = 'Missing Title';
      else if (!type) row.status = 'Invalid Source Type';
      else {
        const titleSubstance = `${normalizeTitle(row.title)}:${row.substanceId}`;
        const repeatsImportRow =
          (row.pmid && seen.pmids.has(row.pmid)) ||
          (row.doi && seen.dois.has(row.doi)) ||
          (row.url && seen.urls.has(row.url)) ||
          seen.titleSubstances.has(titleSubstance);
        if (isDuplicate(row) || repeatsImportRow) {
          row.status = 'Possible Duplicate';
          row.duplicateReason = 'PMID, DOI, URL, or title/substance match';
        }
        if (row.pmid) seen.pmids.add(row.pmid);
        if (row.doi) seen.dois.add(row.doi);
        if (row.url) seen.urls.add(row.url);
        seen.titleSubstances.add(titleSubstance);
      }
      return row;
    });
    setPreview(next);
    setSummary(`Parsed ${next.length} row${next.length === 1 ? '' : 's'}.`);
  };
  const saveRows = async (rows: PreviewRow[]) => {
    if (!supabase || !user) return;
    const valid = rows.filter((row) => row.status === 'Ready' && row.normalizedType);
    const batch = await supabase
      .from('research_import_batches')
      .insert({
        imported_by: user.id,
        row_count: rows.length,
        imported_count: valid.length,
        skipped_count: rows.length - valid.length,
        error_count: rows.filter((row) => !['Ready', 'Possible Duplicate'].includes(row.status))
          .length,
      })
      .select('id')
      .single();
    if (batch.error) {
      setMessage(batch.error.message);
      return;
    }
    for (const row of valid) {
      const source = await supabase
        .from('research_sources')
        .insert(toSourcePayload(row, user.id, row.normalizedType!))
        .select('id')
        .single();
      if (!source.error)
        await supabase
          .from('research_source_substances')
          .insert({
            source_id: source.data.id,
            substance_id: row.substanceId,
            notes: row.notes || null,
            created_by: user.id,
          });
    }
    setSummary(`Imported ${valid.length}; skipped ${rows.length - valid.length}.`);
    setPreview([]);
    await load();
  };
  const saveSingle = async () => {
    if (!supabase || !user) return;
    const normalizedType = normalizeSourceType(form.sourceType);
    if (!form.substanceId) return setMessage('Choose a substance before saving.');
    if (!form.title.trim()) return setMessage('Add a title before saving.');
    if (!normalizedType) return setMessage('Choose a source type before saving.');
    if (isDuplicate(form))
      return setMessage(
        'Possible duplicate found. Check the Source Library before adding this source.',
      );
    const source = await supabase
      .from('research_sources')
      .insert(toSourcePayload(form, user.id, normalizedType))
      .select('id')
      .single();
    if (source.error) return setMessage(source.error.message);
    const link = await supabase
      .from('research_source_substances')
      .insert({
        source_id: source.data.id,
        substance_id: form.substanceId,
        notes: form.notes || null,
        created_by: user.id,
      });
    if (link.error) return setMessage(link.error.message);
    setForm(blankForm);
    setSummary('Source saved.');
    await load();
  };
  const filtered = sources.filter(
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
          Import and manage reviewed source records for StackAtlas.
        </p>
      </div>
      {message && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {message}
        </div>
      )}
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
          parse={buildPreview}
          save={() => saveRows(preview)}
        />
      )}
      <AddSingle form={form} setForm={setForm} substances={substances} save={saveSingle} />
      <Library
        filters={filters}
        setFilters={setFilters}
        substances={substances}
        sources={filtered}
      />
    </section>
  );
}
function toSourcePayload(row: Form, userId: string, sourceType: SourceType) {
  return {
    title: row.title.trim(),
    url: row.url || null,
    pmid: row.pmid || null,
    doi: row.doi || null,
    year: row.year ? Number(row.year) : null,
    journal_or_site: row.journalOrSite || null,
    authors: row.authors || null,
    abstract: row.abstract || null,
    source_type: sourceType,
    source_tier: 'unknown',
    match_status: 'strong_match',
    review_status: 'unreviewed',
    created_by: userId,
    updated_at: new Date().toISOString(),
  };
}
function OwnerImport({
  csv,
  setCsv,
  preview,
  parse,
  save,
}: {
  csv: string;
  setCsv: (v: string) => void;
  preview: PreviewRow[];
  parse: () => void;
  save: () => void;
}) {
  const ready = preview.filter((row) => row.status === 'Ready').length;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-xl font-bold">Owner Bulk Import</h2>
      <p className="text-sm text-slate-500">
        site_owner only. Paste CSV with required columns: substance, source_type, title.
      </p>
      <textarea
        className="mt-3 h-44 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950"
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        placeholder="substance,source_type,title,url,pmid,doi,year,journal_or_site,authors,abstract,notes"
      />
      <div className="mt-3 flex gap-2">
        <button
          onClick={parse}
          className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white dark:bg-white dark:text-slate-900"
        >
          Parse
        </button>
        <button
          onClick={save}
          disabled={!ready}
          className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          Import Ready Rows
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
}: {
  form: Form;
  setForm: (f: Form) => void;
  substances: Substance[];
  save: () => void;
}) {
  const set = (key: keyof Form, value: string) => setForm({ ...form, [key]: value });
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-xl font-bold">Add Single Source</h2>
      <p className="text-sm text-slate-500">
        Save one useful article, label, COA, vendor document, or other source.
      </p>
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
        {(['title', 'url', 'pmid', 'doi', 'year', 'journalOrSite', 'notes'] as (keyof Form)[]).map(
          (key) => (
            <input
              key={key}
              className="rounded-xl border px-3 py-2 dark:bg-zinc-950"
              placeholder={
                key === 'journalOrSite' ? 'Journal / Site' : key[0].toUpperCase() + key.slice(1)
              }
              value={form[key]}
              onChange={(e) => set(key, e.target.value)}
            />
          ),
        )}
      </div>
      <button
        onClick={save}
        className="mt-3 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white"
      >
        Save Source
      </button>
    </section>
  );
}
function Library({
  filters,
  setFilters,
  substances,
  sources,
}: {
  filters: { substanceId: string; sourceType: string; search: string };
  setFilters: (f: { substanceId: string; sourceType: string; search: string }) => void;
  substances: Substance[];
  sources: Source[];
}) {
  const set = (key: keyof typeof filters, value: string) =>
    setFilters({ ...filters, [key]: value });
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-xl font-bold">Source Library</h2>
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
                  No source records yet. Add one source or ask the site owner to import a CSV batch.
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
              <td className="px-3 py-2">{row.substanceId ? 'Matched' : '—'}</td>
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
