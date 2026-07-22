// Pure parsers for the two data-pack input formats: hand-written or
// model-generated JSON, and a source-only CSV export. Neither function does
// I/O or deep field validation — see validate.ts for that. Both return the
// best-effort DataPack they could build plus a list of envelope/row issues so
// the caller can show a truthful preview even for slightly malformed input.

import {
  DATA_PACK_KIND,
  DATA_PACK_SCHEMA_VERSION,
  ENTITY_ORDER,
  type Classification,
  type DataPack,
  type EntityKind,
  type ImportedFileKind,
  type ImportedFileSummary,
  type ResearchSourceType,
  type RowIssue,
  type SourcePackRow,
  type SubstancePackRow,
} from './types';
import { hashText } from './hash';
import { extractMarkdownSource, type SubstanceCatalogEntry } from './markdown';
import { slugify } from './validate';
import { extractZip, ZipLimitError } from './zip';
import { parseCsvRows } from './parse-csv';
import { convertResearchPackage, isResearchPackageEntry } from './research-package';

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
type CsvField =
  | 'title'
  | 'substances'
  | 'brands'
  | 'stacks'
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
  brand: 'brands',
  brands: 'brands',
  stack: 'stacks',
  stacks: 'stacks',
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
    const brandsRaw = get(raw, 'brands');
    if (brandsRaw) {
      row.brands = brandsRaw
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    const stacksRaw = get(raw, 'stacks');
    if (stacksRaw) {
      row.stacks = stacksRaw
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

// ---------------------------------------------------------------------------
// Substance-catalog CSV — a ChatGPT-generated catalog export
// (catalog_id,canonical_name,aliases,category,subcategory,origin_type,
// use_context_tags,us_availability_legal_flag,priority,sources), distinct
// from the sources-only CSV above. Detected by header shape and mapped into
// the pack's substances[] so it flows through the same validate/preview/
// import path as a hand-written pack.
// ---------------------------------------------------------------------------

type CatalogCsvField =
  | 'catalog_id'
  | 'canonical_name'
  | 'aliases'
  | 'category'
  | 'subcategory'
  | 'origin_type'
  | 'use_context_tags'
  | 'us_availability_legal_flag'
  | 'priority'
  | 'sources';

const CATALOG_HEADER_ALIASES: Record<string, CatalogCsvField> = {
  catalogid: 'catalog_id',
  canonicalname: 'canonical_name',
  aliases: 'aliases',
  category: 'category',
  subcategory: 'subcategory',
  origintype: 'origin_type',
  usecontexttags: 'use_context_tags',
  usavailabilitylegalflag: 'us_availability_legal_flag',
  priority: 'priority',
  sources: 'sources',
};

function resolveCatalogHeader(header: string): CatalogCsvField | null {
  return CATALOG_HEADER_ALIASES[normalizeHeader(header)] ?? null;
}

/** Detects the substance-catalog CSV shape: a `canonical_name` column, or
 * both `catalog_id` and `category` columns. */
export function isSubstanceCatalogCsv(headerRow: string[]): boolean {
  const normalized = new Set(headerRow.map(normalizeHeader));
  if (normalized.has('canonicalname')) return true;
  return normalized.has('catalogid') && normalized.has('category');
}

const GUARDRAIL_WORDS = /\b(recommended|proven|best|safe|effective)\b/gi;

/** Respects the pack's language guardrails (see docs/data-packs/README.md
 * §4) even though this text is metadata-derived, not a finding summary. */
function stripGuardrailWords(text: string): string {
  return text.replace(GUARDRAIL_WORDS, '').replace(/\s{2,}/g, ' ').trim();
}

function buildCatalogDescription(
  name: string,
  subcategory: string,
  originType: string,
  category: string,
): string {
  const base = [subcategory, originType].filter(Boolean).join('. ');
  const description =
    base || category
      ? `${base}${base ? '. ' : ''}Catalog domain: ${category || 'Unclassified'}.`
      : `${name} — catalog entry.`;
  return stripGuardrailWords(description);
}

function classifyCatalogRow(flags: string, category: string): Classification {
  if (
    /RESEARCH-ONLY|GRAY|FDA-UNAPPROVED|INVESTIGATIONAL|CANNOT LAWFULLY/i.test(flags) ||
    /\bsarm\b|designer|prohormone|research drug|research chemical|senolytic/i.test(category)
  ) {
    return 'Frontier';
  }
  if (
    /RX-DRUG|OTC-DRUG|CONTROLLED-S/i.test(flags) ||
    /\bdrug\b|hormone|steroid|androgen|secretagogue|biologic/i.test(category)
  ) {
    return 'Clinical';
  }
  if (/\bFOOD\b|SUPPLEMENT-MARKETED|COSMETIC-MARKETED/i.test(flags)) {
    return 'Everyday';
  }
  return 'Unknown';
}

export function parseSubstanceCatalogCsv(text: string): { pack: DataPack | null; issues: RowIssue[] } {
  const issues: RowIssue[] = [];
  const rawRows = parseCsvRows(text);
  if (rawRows.length === 0) {
    return { pack: null, issues: [{ path: 'root', message: 'CSV is empty', severity: 'error' }] };
  }

  const headerRow = rawRows[0];
  const headerCount = headerRow.length;
  const fieldMap = headerRow.map(resolveCatalogHeader);
  headerRow.forEach((header, i) => {
    if (!fieldMap[i]) {
      issues.push({
        path: `csv:header[${i}]`,
        message: `unknown column: "${header}"`,
        severity: 'warning',
      });
    }
  });

  const get = (row: string[], field: CatalogCsvField): string => {
    const idx = fieldMap.indexOf(field);
    return idx === -1 ? '' : (row[idx] ?? '').trim();
  };

  const substances: SubstancePackRow[] = [];
  const seenSlugs = new Set<string>();
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

    const canonicalName = get(raw, 'canonical_name');
    const slug = slugify(canonicalName);
    if (!canonicalName || !slug) {
      issues.push({
        path: `csv:row${rowNumber}`,
        message: `row ${rowNumber}: empty canonical_name, skipped`,
        severity: 'warning',
      });
      continue;
    }
    if (seenSlugs.has(slug)) {
      issues.push({
        path: `csv:row${rowNumber}`,
        message: `row ${rowNumber}: duplicate canonical_name "${canonicalName}", first occurrence kept`,
        severity: 'warning',
      });
      continue;
    }
    seenSlugs.add(slug);

    const category = get(raw, 'category');
    const subcategory = get(raw, 'subcategory');
    const originType = get(raw, 'origin_type');
    const flags = get(raw, 'us_availability_legal_flag');
    const aliasesRaw = get(raw, 'aliases');

    const row: SubstancePackRow = {
      slug,
      name: canonicalName,
      classification: classifyCatalogRow(flags, category),
      description: buildCatalogDescription(canonicalName, subcategory, originType, category),
    };

    const aliases = aliasesRaw
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
    if (aliases.length) row.aliases = aliases;

    const typeTags = [...new Set([category, subcategory].filter(Boolean))];
    if (typeTags.length) row.type_tags = typeTags;

    substances.push(row);
  }

  const pack: DataPack = {
    kind: DATA_PACK_KIND,
    schema_version: DATA_PACK_SCHEMA_VERSION,
    substances,
  };
  return { pack, issues };
}

/** CSV entry point for uploads/paste: dispatches to the substance-catalog
 * parser or the sources parser based on header shape. */
export function parseCsv(text: string): { pack: DataPack | null; issues: RowIssue[] } {
  const headerRow = parseCsvRows(text)[0] ?? [];
  return isSubstanceCatalogCsv(headerRow) ? parseSubstanceCatalogCsv(text) : parseSourcesCsv(text);
}

// ---------------------------------------------------------------------------
// Multi-file / ZIP upload — "Upload research files" in Admin → Research.
//
// Accepts any mix of .zip, .md/.markdown, .csv, and .json files (a ZIP is
// unpacked and its supported entries dispatched the same way), normalizes
// everything into one DataPack, and reports per-file results so one
// malformed file never discards the valid ones from the same batch. The
// combined pack + issues then flow through the exact same validatePack /
// runImport pipeline as a hand-pasted JSON pack.
// ---------------------------------------------------------------------------

function appendPack(target: DataPack, addition: DataPack): void {
  if (addition.substances?.length) target.substances = [...(target.substances ?? []), ...addition.substances];
  if (addition.brands?.length) target.brands = [...(target.brands ?? []), ...addition.brands];
  if (addition.stacks?.length) target.stacks = [...(target.stacks ?? []), ...addition.stacks];
  if (addition.sources?.length) target.sources = [...(target.sources ?? []), ...addition.sources];
  if (addition.findings?.length) target.findings = [...(target.findings ?? []), ...addition.findings];
}

function entityCounts(pack: DataPack): Partial<Record<EntityKind, number>> {
  const counts: Partial<Record<EntityKind, number>> = {};
  for (const entity of ENTITY_ORDER) {
    const n = (pack[entity] ?? []).length;
    if (n > 0) counts[entity] = n;
  }
  return counts;
}

export interface ParseImportFilesResult {
  pack: DataPack;
  issues: RowIssue[]; // envelope-level issues from JSON/CSV entries, path-prefixed with the source filename
  files: ImportedFileSummary[];
}

export async function parseImportFiles(
  inputFiles: File[],
  catalog: SubstanceCatalogEntry[] = [],
): Promise<ParseImportFilesResult> {
  const combined: DataPack = { kind: DATA_PACK_KIND, schema_version: DATA_PACK_SCHEMA_VERSION };
  const files: ImportedFileSummary[] = [];
  const issues: RowIssue[] = [];

  const recordParsed = (
    path: string,
    name: string,
    kind: ImportedFileKind,
    result: { pack: DataPack | null; issues: RowIssue[] },
  ) => {
    result.issues.forEach((issue) =>
      issues.push({ ...issue, path: `${name}${issue.path ? `:${issue.path}` : ''}` }),
    );
    const hasError = result.issues.some((i) => i.severity === 'error');
    if (!result.pack || hasError) {
      files.push({
        path,
        name,
        kind,
        status: 'error',
        message: result.issues.find((i) => i.severity === 'error')?.message ?? 'Could not parse this file.',
      });
      return;
    }
    appendPack(combined, result.pack);
    files.push({ path, name, kind, status: 'parsed', entityCounts: entityCounts(result.pack) });
  };

  // Convert a set of research-package entries (from a zip or loose drops) as a
  // group and record each consumed file. Returns the set of paths consumed so
  // the per-file loop skips them.
  const recordPackage = (
    entries: { path: string; name: string; ext: string; content: string }[],
  ): Set<string> => {
    const result = convertResearchPackage(entries);
    if (!result.pack) return new Set();
    appendPack(combined, result.pack);
    result.issues.forEach((issue) => issues.push(issue));
    const byFile: Record<string, Partial<Record<EntityKind, number>>> = {
      'substances.json': { substances: result.pack.substances?.length ?? 0 },
      'brands.json': { brands: result.pack.brands?.length ?? 0 },
      'products.json': {},
      'evidence.json': { sources: result.pack.sources?.length ?? 0 },
      'source_ledger.csv': { sources: result.pack.sources?.length ?? 0 },
    };
    entries
      .filter((e) => result.handled.has(e.path))
      .forEach((e) =>
        files.push({
          path: e.path,
          name: e.name,
          kind: e.ext === '.csv' ? 'csv' : 'json',
          status: 'parsed',
          entityCounts: byFile[e.name.toLowerCase().split('/').pop() ?? ''],
        }),
      );
    return result.handled;
  };

  const recordMarkdown = async (path: string, name: string, text: string) => {
    try {
      const { source, ambiguous } = extractMarkdownSource(name, text, catalog);
      source.content_hash = await hashText(text);
      source.raw_content = text;
      source.original_filename = name;
      source.file_type = 'markdown';
      source.import_relative_path = path;
      appendPack(combined, { kind: DATA_PACK_KIND, schema_version: DATA_PACK_SCHEMA_VERSION, sources: [source] });
      files.push({
        path,
        name,
        kind: 'markdown',
        status: 'parsed',
        entityCounts: { sources: 1 },
        ambiguousMatches: ambiguous.length > 0 ? ambiguous : undefined,
      });
    } catch (err) {
      files.push({
        path,
        name,
        kind: 'markdown',
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  // Loose research-package files dropped without a zip are gathered and
  // converted as one group so products still merge into their brand.
  const looseFiles: File[] = [];
  const loosePackageEntries: { path: string; name: string; ext: string; content: string }[] = [];
  for (const file of inputFiles) {
    const lower = file.name.toLowerCase();
    const candidate = !lower.endsWith('.zip') && (lower.endsWith('.json') || lower.endsWith('.csv')) && isResearchPackageEntry(file.name);
    if (candidate) {
      const content = await file.text();
      // A research-package JSON file is a bare array; a hand-authored DataPack
      // named the same is an object — send that to the normal parser instead.
      const looksLikePackage = lower.endsWith('.csv') || /^\s*\[/.test(content);
      if (looksLikePackage) {
        loosePackageEntries.push({
          path: file.name,
          name: file.name,
          ext: lower.endsWith('.csv') ? '.csv' : '.json',
          content,
        });
        continue;
      }
    }
    looseFiles.push(file);
  }
  const handledLoose = recordPackage(loosePackageEntries);

  for (const file of looseFiles) {
    const lower = file.name.toLowerCase();
    if (handledLoose.has(file.name)) continue;

    if (lower.endsWith('.zip')) {
      try {
        const extraction = await extractZip(file);
        for (const entry of extraction.skipped) {
          files.push({
            path: entry.path,
            name: entry.path.split('/').pop() ?? entry.path,
            kind: 'unsupported',
            status: 'skipped',
            message: entry.reason,
          });
        }
        // An advanced research package (substances.json/brands.json/
        // products.json/evidence.json/source_ledger.csv) is converted as a
        // group first — products must merge into their brand across files —
        // then its files are skipped by the per-file loop below.
        const handledInZip = recordPackage(extraction.entries);
        for (const entry of extraction.entries) {
          if (handledInZip.has(entry.path)) continue;
          if (entry.ext === '.md' || entry.ext === '.markdown') {
            await recordMarkdown(entry.path, entry.name, entry.content);
          } else if (entry.ext === '.json') {
            recordParsed(entry.path, entry.name, 'json', parseDataPackJson(entry.content));
          } else if (entry.ext === '.csv') {
            recordParsed(entry.path, entry.name, 'csv', parseCsv(entry.content));
          }
        }
      } catch (err) {
        const message =
          err instanceof ZipLimitError
            ? err.message
            : err instanceof Error
              ? err.message
              : String(err);
        files.push({ path: file.name, name: file.name, kind: 'zip', status: 'error', message });
      }
      continue;
    }

    if (lower.endsWith('.md') || lower.endsWith('.markdown')) {
      await recordMarkdown(file.name, file.name, await file.text());
    } else if (lower.endsWith('.json')) {
      recordParsed(file.name, file.name, 'json', parseDataPackJson(await file.text()));
    } else if (lower.endsWith('.csv')) {
      recordParsed(file.name, file.name, 'csv', parseCsv(await file.text()));
    } else {
      files.push({ path: file.name, name: file.name, kind: 'unsupported', status: 'skipped', message: 'unsupported file type' });
    }
  }

  return { pack: combined, issues, files };
}
