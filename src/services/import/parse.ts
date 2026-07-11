// Pure parsers for the two data-pack input formats: hand-written or
// model-generated JSON, and a source-only CSV export. Neither function does
// I/O or deep field validation — see validate.ts for that. Both return the
// best-effort DataPack they could build plus a list of envelope/row issues so
// the caller can show a truthful preview even for slightly malformed input.

import {
  DATA_PACK_KIND,
  DATA_PACK_SCHEMA_VERSION,
  ENTITY_ORDER,
  type DataPack,
  type EntityKind,
  type ResearchSourceType,
  type RowIssue,
  type SourcePackRow,
} from './types';

const KNOWN_TOP_LEVEL_KEYS = new Set<string>([
  'kind',
  'schema_version',
  'generated_by',
  'generated_at',
  'label',
  ...ENTITY_ORDER,
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseDataPackJson(text: string): { pack: DataPack | null; issues: RowIssue[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return {
      pack: null,
      issues: [
        {
          path: 'root',
          message: `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
          severity: 'error',
        },
      ],
    };
  }

  if (!isPlainObject(parsed)) {
    return {
      pack: null,
      issues: [
        { path: 'root', message: 'Top-level JSON value must be an object', severity: 'error' },
      ],
    };
  }

  const issues: RowIssue[] = [];

  for (const key of Object.keys(parsed)) {
    if (!KNOWN_TOP_LEVEL_KEYS.has(key)) {
      issues.push({ path: key, message: `unknown top-level key: ${key}`, severity: 'warning' });
    }
  }

  const entityArrays: Partial<Record<EntityKind, unknown[]>> = {};
  let hasAnyEntity = false;
  for (const key of ENTITY_ORDER) {
    if (key in parsed) {
      const value = parsed[key];
      if (!Array.isArray(value)) {
        issues.push({ path: key, message: `${key} must be an array`, severity: 'error' });
      } else {
        entityArrays[key] = value;
        hasAnyEntity = true;
      }
    }
  }

  const hasKind = 'kind' in parsed;
  const hasSchemaVersion = 'schema_version' in parsed;

  if (hasKind && parsed.kind !== DATA_PACK_KIND) {
    issues.push({
      path: 'kind',
      message: `invalid kind: ${JSON.stringify(parsed.kind)}`,
      severity: 'error',
    });
  }
  if (hasSchemaVersion && parsed.schema_version !== DATA_PACK_SCHEMA_VERSION) {
    issues.push({
      path: 'schema_version',
      message: `invalid schema_version: ${JSON.stringify(parsed.schema_version)}`,
      severity: 'error',
    });
  }

  if (!hasAnyEntity) {
    issues.push({
      path: 'root',
      message: 'pack has no substances/brands/stacks/sources/findings arrays',
      severity: 'error',
    });
  } else if (!hasKind || !hasSchemaVersion) {
    issues.push({
      path: 'kind',
      message: 'missing kind, assuming stackatlas-data-pack v1',
      severity: 'warning',
    });
  }

  if (issues.some((issue) => issue.severity === 'error')) {
    return { pack: null, issues };
  }

  const pack: DataPack = {
    kind: DATA_PACK_KIND,
    schema_version: DATA_PACK_SCHEMA_VERSION,
    generated_by: typeof parsed.generated_by === 'string' ? parsed.generated_by : undefined,
    generated_at: typeof parsed.generated_at === 'string' ? parsed.generated_at : undefined,
    label: typeof parsed.label === 'string' ? parsed.label : undefined,
    substances: entityArrays.substances as DataPack['substances'],
    brands: entityArrays.brands as DataPack['brands'],
    stacks: entityArrays.stacks as DataPack['stacks'],
    sources: entityArrays.sources as DataPack['sources'],
    findings: entityArrays.findings as DataPack['findings'],
  };

  return { pack, issues };
}

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

/** Tokenizes CSV text into rows of raw (untrimmed) cell strings. Handles
 * quoted fields, escaped ("") quotes, and both \n and \r\n line endings.
 * Fully blank lines are dropped. */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let cell = '';
  let row: string[] = [];
  let quoted = false;
  const input = text.replace(/^\uFEFF/, ''); // strip BOM

  const pushCell = () => {
    row.push(cell);
    cell = '';
  };
  const pushRow = () => {
    if (row.length > 1 || row[0] !== '') rows.push(row);
    row = [];
  };

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      pushCell();
    } else if (char === '\r') {
      if (next === '\n') continue; // let the \n branch close the row
      pushCell();
      pushRow();
    } else if (char === '\n') {
      pushCell();
      pushRow();
    } else {
      cell += char;
    }
  }
  pushCell();
  pushRow();
  return rows;
}

type CsvField =
  | 'title'
  | 'substances'
  | 'source_type'
  | 'url'
  | 'pmid'
  | 'doi'
  | 'year'
  | 'journal_or_site'
  | 'authors'
  | 'abstract'
  | 'notes';

const HEADER_ALIASES: Record<string, CsvField> = {
  title: 'title',
  substance: 'substances',
  substances: 'substances',
  sourcetype: 'source_type',
  type: 'source_type',
  url: 'url',
  link: 'url',
  pmid: 'pmid',
  doi: 'doi',
  year: 'year',
  journalorsite: 'journal_or_site',
  journal: 'journal_or_site',
  site: 'journal_or_site',
  authors: 'authors',
  abstract: 'abstract',
  notes: 'notes',
};

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '');
}

function resolveHeader(header: string): CsvField | null {
  return HEADER_ALIASES[normalizeHeader(header)] ?? null;
}

export function parseSourcesCsv(text: string): { pack: DataPack | null; issues: RowIssue[] } {
  const issues: RowIssue[] = [];
  const rawRows = parseCsvRows(text);
  if (rawRows.length === 0) {
    return { pack: null, issues: [{ path: 'root', message: 'CSV is empty', severity: 'error' }] };
  }

  const headerRow = rawRows[0];
  const headerCount = headerRow.length;
  const fieldMap = headerRow.map(resolveHeader);
  headerRow.forEach((header, i) => {
    if (!fieldMap[i]) {
      issues.push({
        path: `csv:header[${i}]`,
        message: `unknown column: "${header}"`,
        severity: 'warning',
      });
    }
  });

  const get = (row: string[], field: CsvField): string => {
    const idx = fieldMap.indexOf(field);
    return idx === -1 ? '' : (row[idx] ?? '').trim();
  };

  const sources: SourcePackRow[] = [];
  for (let i = 1; i < rawRows.length; i += 1) {
    const raw = rawRows[i];
    const rowNumber = i + 1; // header is row 1, matching a spreadsheet view
    if (raw.length !== headerCount) {
      issues.push({
        path: `csv:row${rowNumber}`,
        message: `row ${rowNumber}: expected ${headerCount} columns, got ${raw.length} — check for unescaped commas`,
        severity: 'error',
      });
      continue;
    }

    const yearRaw = get(raw, 'year');
    const substancesRaw = get(raw, 'substances');
    const row: SourcePackRow = {
      title: get(raw, 'title'),
      source_type: get(raw, 'source_type') as ResearchSourceType,
    };
    const url = get(raw, 'url');
    const pmid = get(raw, 'pmid');
    const doi = get(raw, 'doi');
    const journalOrSite = get(raw, 'journal_or_site');
    const authors = get(raw, 'authors');
    const abstract = get(raw, 'abstract');
    const notes = get(raw, 'notes');
    if (url) row.url = url;
    if (pmid) row.pmid = pmid;
    if (doi) row.doi = doi;
    if (yearRaw) row.year = Number(yearRaw);
    if (journalOrSite) row.journal_or_site = journalOrSite;
    if (authors) row.authors = authors;
    if (abstract) row.abstract = abstract;
    if (notes) row.notes = notes;
    if (substancesRaw) {
      row.substances = substancesRaw
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    sources.push(row);
  }

  const pack: DataPack = {
    kind: DATA_PACK_KIND,
    schema_version: DATA_PACK_SCHEMA_VERSION,
    sources,
  };
  return { pack, issues };
}
