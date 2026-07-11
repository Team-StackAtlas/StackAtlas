import type { SupabaseClient } from '@supabase/supabase-js';
import {
  SOURCE_TYPES,
  type BulkImportResult,
  type ImportReadyRow,
  type ParseResult,
  type PreviewRow,
  type SingleSourceResult,
  type SourceForm,
  type SourceLibraryRow,
  type SourceType,
  type SubstanceOption,
} from './types';

export const sourceTypeOptions: { value: SourceType; label: string }[] = [
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

export const blankSourceForm: SourceForm = {
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
const requiredHeaders = ['substance', 'source_type', 'title'];

export function clean(value: unknown) {
  return String(value ?? '').trim();
}
function key(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^\ufeff/, '')
    .replace(/\s*\/\s*/g, '_')
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_');
}
function norm(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ');
}
function normalizedId(value: string) {
  return clean(value).toLowerCase();
}
function nullable(value: string) {
  const v = clean(value);
  return v ? v : null;
}
function stripFences(text: string) {
  return text
    .replace(/^\ufeff/, '')
    .trim()
    .replace(/^```(?:csv)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

export function typeLabel(value?: string | null) {
  return sourceTypeOptions.find((option) => option.value === value)?.label ?? 'Other';
}
export function normalizeSourceType(value: string): SourceType | null {
  const k = key(value);
  const map: Record<string, SourceType> = {
    human_study: 'human_study',
    human_rct: 'human_study',
    clinical_trial: 'human_study',
    review: 'review_or_meta_analysis',
    meta_analysis: 'review_or_meta_analysis',
    review_or_meta_analysis: 'review_or_meta_analysis',
    animal_study: 'animal_study',
    animal: 'animal_study',
    in_vitro: 'in_vitro_or_mechanistic',
    mechanistic: 'in_vitro_or_mechanistic',
    in_vitro_or_mechanistic: 'in_vitro_or_mechanistic',
    official_label: 'official_label_or_document',
    official_label_or_document: 'official_label_or_document',
    government_document: 'official_label_or_document',
    vendor_document: 'brand_or_vendor_document',
    brand_or_vendor_document: 'brand_or_vendor_document',
    coa: 'coa_or_testing_document',
    testing_document: 'coa_or_testing_document',
    coa_or_testing_document: 'coa_or_testing_document',
    practitioner_source: 'practitioner_source',
    influencer_mention: 'community_or_influencer_mention',
    community_or_influencer_mention: 'community_or_influencer_mention',
    other: 'other',
  };
  return map[k] ?? (SOURCE_TYPES.includes(k as SourceType) ? (k as SourceType) : null);
}

function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let cell = '';
  let row: string[] = [];
  let quoted = false;
  const input = stripFences(text);
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i],
      next = input[i + 1];
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

function headerName(value: string) {
  const k = key(value);
  const aliases: Record<string, string> = {
    source_type: 'source_type',
    sourcetype: 'source_type',
    type: 'source_type',
    journal_site: 'journal_or_site',
    journal_or_site: 'journal_or_site',
    journalsite: 'journal_or_site',
  };
  return aliases[k] ?? k;
}

export function buildSubstanceMatcher(substances: SubstanceOption[]) {
  const map = new Map<string, SubstanceOption>();
  substances.forEach((s) => {
    map.set(norm(s.name), s);
    if (s.slug) map.set(norm(s.slug), s);
  });
  return (value: string) => map.get(norm(value)) ?? null;
}

function validYear(value: string) {
  return !value || /^\d{4}$/.test(value);
}
function sourceKey(row: SourceLibraryRow) {
  return [
    row.pmid && `p:${normalizedId(row.pmid)}`,
    row.doi && `d:${normalizedId(row.doi)}`,
    row.url && `u:${clean(row.url)}`,
  ].filter(Boolean) as string[];
}

export function parseSourceCsv(
  csv: string,
  substances: SubstanceOption[],
  sources: SourceLibraryRow[],
): ParseResult {
  const rows = parseCsvRows(csv);
  if (!rows.length)
    return { ok: false, error: 'Paste a CSV with headers before parsing.', rows: [] };
  const headers = rows[0].map(headerName);
  const duplicates = headers.filter((h, i) => headers.indexOf(h) !== i);
  if (duplicates.length)
    return { ok: false, error: `Duplicate CSV header: ${duplicates[0]}.`, rows: [] };
  const missing = requiredHeaders.filter((h) => !headers.includes(h));
  if (missing.length)
    return {
      ok: false,
      error: `Missing required CSV header${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}.`,
      rows: [],
    };
  const matcher = buildSubstanceMatcher(substances);
  const existingIds = new Set<string>();
  const existingTitleSubstances = new Set<string>();
  sources.forEach((source) => {
    sourceKey(source).forEach((v) => existingIds.add(v));
    source.research_source_substances?.forEach(
      (l) =>
        l.substances?.id && existingTitleSubstances.add(`${norm(source.title)}:${l.substances.id}`),
    );
  });
  const seen = new Set<string>();
  const preview: PreviewRow[] = rows.slice(1).map((values, index) => {
    const get = (name: string) => clean(values[headers.indexOf(name)]);
    const submittedSubstance = get('substance');
    const substance = submittedSubstance ? matcher(submittedSubstance) : null;
    const normalizedType = normalizeSourceType(get('source_type')) ?? undefined;
    const row: PreviewRow = {
      ...blankSourceForm,
      rowNumber: index + 2,
      submittedSubstance,
      substanceId: substance?.id ?? '',
      title: get('title'),
      sourceType: get('source_type'),
      normalizedType,
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
    if (!submittedSubstance) row.status = 'Missing Substance';
    else if (!substance) row.status = 'Unknown Substance';
    else if (!row.title) row.status = 'Missing Title';
    else if (!normalizedType) row.status = 'Invalid Source Type';
    else if (!validYear(row.year)) row.status = 'Invalid Year';
    else {
      const ids = [
        `p:${normalizedId(row.pmid)}`,
        `d:${normalizedId(row.doi)}`,
        `u:${clean(row.url)}`,
      ].filter((v) => !v.endsWith(':'));
      const titleSubstance = `${norm(row.title)}:${row.substanceId}`;
      if (
        ids.some((id) => existingIds.has(id) || seen.has(id)) ||
        existingTitleSubstances.has(titleSubstance) ||
        seen.has(titleSubstance)
      ) {
        row.status = 'Possible Duplicate';
        row.duplicateReason = 'PMID, DOI, URL, or title/substance match';
      }
      ids.forEach((id) => seen.add(id));
      seen.add(titleSubstance);
    }
    return row;
  });
  return { ok: true, rows: preview };
}

export function toImportRow(row: PreviewRow | SourceForm, sourceType: SourceType): ImportReadyRow {
  return {
    substance_id: row.substanceId,
    title: clean(row.title),
    source_type: sourceType,
    url: nullable(row.url),
    pmid: nullable(row.pmid),
    doi: nullable(row.doi),
    year: row.year ? Number(row.year) : null,
    journal_or_site: nullable(row.journalOrSite),
    authors: nullable(row.authors),
    abstract: nullable(row.abstract),
    notes: nullable(row.notes),
  };
}

export async function importSourceRows(client: SupabaseClient, rows: ImportReadyRow[]) {
  const { data, error } = await client.rpc('owner_bulk_import_research_sources', { p_rows: rows });
  if (error) throw error;
  return data as BulkImportResult;
}
export async function addSingleResearchSource(client: SupabaseClient, row: ImportReadyRow) {
  const { data, error } = await client.rpc('admin_add_research_source', { p_row: row });
  if (error) throw error;
  return data as SingleSourceResult;
}
