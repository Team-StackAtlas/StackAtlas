// Client-side mirror of the server-side validation in
// supabase/migrations/0016_research_import_system.sql, so the import preview
// tells the truth about what will happen before any RPC is called. Pure —
// takes a parsed DataPack plus the natural keys already in the database and
// returns a row-by-row report; does no I/O itself.

import {
  CLASSIFICATIONS_V1,
  DOSE_UNITS_V1,
  ENTITY_ORDER,
  FINDING_DIRECTIONS_V1,
  FINDING_STUDY_TYPES_V1,
  RESEARCH_SOURCE_TYPES_V1,
  RISK_LEVELS_V1,
  type BrandPackRow,
  type DataPack,
  type EntityKind,
  type ExistingKeys,
  type FindingPackRow,
  type PackValidationReport,
  type RowIssue,
  type RowStatus,
  type SourcePackRow,
  type StackPackRow,
  type SubstancePackRow,
  type ValidatedRow,
} from './types';

/** Mirrors import_slugify() in the migration: lowercase, non-alphanumeric
 * runs collapse to a single '-', trimmed of leading/trailing '-'. */
export function slugify(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function trimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function checkRequired(value: unknown, path: string, issues: RowIssue[]): void {
  if (trimmed(value) === '') {
    issues.push({ path, message: `${path} is required`, severity: 'error' });
  }
}

function checkEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string,
  issues: RowIssue[],
  isRequired: boolean,
): void {
  const v = trimmed(value);
  if (v === '') {
    if (isRequired) issues.push({ path, message: `${path} is required`, severity: 'error' });
    return;
  }
  if (!(allowed as readonly string[]).includes(v)) {
    issues.push({ path, message: `invalid ${path}: ${v}`, severity: 'error' });
  }
}

function isFourDigitYear(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  return /^\d{4}$/.test(String(value));
}

/** All natural-key forms a source row could be matched by (pmid/doi/url are
 * independent identities; title+year is the fallback). Used both to build
 * `ExistingKeys.sourceKeys` from the database and to cross-reference a
 * finding's source_pmid/source_doi/source_url against a pack's own sources. */
export function sourceKeyVariants(row: {
  pmid?: string | null;
  doi?: string | null;
  url?: string | null;
  title?: string | null;
  year?: number | null;
  content_hash?: string | null;
}): string[] {
  const keys: string[] = [];
  const pmid = trimmed(row.pmid);
  const doi = trimmed(row.doi);
  const url = trimmed(row.url);
  const title = trimmed(row.title);
  const contentHash = trimmed(row.content_hash);
  if (pmid) keys.push(`p:${pmid.toLowerCase()}`);
  if (doi) keys.push(`d:${doi.toLowerCase()}`);
  if (url) keys.push(`u:${url}`);
  // Documents with no other identity (e.g. imported Markdown) dedupe on the
  // exact text of the file, checked before the weaker title+year fallback.
  if (contentHash) keys.push(`h:${contentHash}`);
  if (title) keys.push(`t:${title.toLowerCase()}|${row.year ?? ''}`);
  return keys;
}

function findingSourceRefKeys(row: FindingPackRow): string[] {
  const keys: string[] = [];
  const pmid = trimmed(row.source_pmid);
  const doi = trimmed(row.source_doi);
  const url = trimmed(row.source_url);
  if (pmid) keys.push(`p:${pmid.toLowerCase()}`);
  if (doi) keys.push(`d:${doi.toLowerCase()}`);
  if (url) keys.push(`u:${url}`);
  return keys;
}

/** Only rows with no error-severity issue register their natural key for
 * dedup purposes — an earlier row's typo shouldn't wrongly flag a later,
 * correct row as a duplicate. */
function classifyStatus(
  hasError: boolean,
  naturalKey: string | null,
  seen: Set<string>,
  existing: Set<string>,
): RowStatus {
  if (hasError) return 'invalid';
  if (naturalKey) {
    if (seen.has(naturalKey)) return 'duplicate_in_pack';
    seen.add(naturalKey);
    if (existing.has(naturalKey)) return 'exists';
  }
  return 'ready';
}

function emptyCounts() {
  return { total: 0, ready: 0, exists: 0, invalid: 0, duplicates: 0 };
}

export function validatePack(pack: DataPack, existing: ExistingKeys): PackValidationReport {
  const packIssues: RowIssue[] = [];
  const rows: ValidatedRow[] = [];

  // Whole-pack cross-reference sets, built from every row up front regardless
  // of that row's own validity — a stack/finding/source reference is either
  // resolvable or it isn't.
  const packSubstanceSlugs = new Set(
    (pack.substances ?? []).map((r) => slugify(r.slug)).filter(Boolean),
  );
  const packSourceAllKeys = new Set<string>();
  (pack.sources ?? []).forEach((row) =>
    sourceKeyVariants(row).forEach((k) => packSourceAllKeys.add(k)),
  );

  const counts: PackValidationReport['counts'] = {
    substances: emptyCounts(),
    brands: emptyCounts(),
    stacks: emptyCounts(),
    sources: emptyCounts(),
    findings: emptyCounts(),
  };

  const record = (
    entity: EntityKind,
    index: number,
    status: RowStatus,
    naturalKey: string | null,
    summary: string,
    issues: RowIssue[],
    row: unknown,
  ) => {
    rows.push({
      entity,
      index,
      status,
      naturalKey,
      summary,
      issues,
      row: row as Record<string, unknown>,
    });
    counts[entity].total += 1;
    if (status === 'ready') counts[entity].ready += 1;
    else if (status === 'exists') counts[entity].exists += 1;
    else if (status === 'invalid') counts[entity].invalid += 1;
    else if (status === 'duplicate_in_pack') counts[entity].duplicates += 1;
  };

  // Substances ----------------------------------------------------------------
  const substanceSeen = new Set<string>();
  (pack.substances ?? []).forEach((row: SubstancePackRow, index) => {
    const issues: RowIssue[] = [];
    const slug = slugify(row.slug);
    if (!slug) issues.push({ path: 'slug', message: 'slug is required', severity: 'error' });
    checkRequired(row.name, 'name', issues);
    checkRequired(row.description, 'description', issues);
    checkEnum(row.classification, CLASSIFICATIONS_V1, 'classification', issues, true);
    checkEnum(row.risk_level, RISK_LEVELS_V1, 'risk_level', issues, false);
    const hasError = issues.some((i) => i.severity === 'error');
    const naturalKey = slug || null;
    const status = classifyStatus(hasError, naturalKey, substanceSeen, existing.substanceSlugs);
    record(
      'substances',
      index,
      status,
      naturalKey,
      trimmed(row.name) || slug || `substance[${index}]`,
      issues,
      row,
    );
  });

  // Brands ----------------------------------------------------------------
  const brandSeen = new Set<string>();
  (pack.brands ?? []).forEach((row: BrandPackRow, index) => {
    const issues: RowIssue[] = [];
    const slug = slugify(row.slug);
    if (!slug) issues.push({ path: 'slug', message: 'slug is required', severity: 'error' });
    checkRequired(row.name, 'name', issues);
    const hasError = issues.some((i) => i.severity === 'error');
    const naturalKey = slug || null;
    const status = classifyStatus(hasError, naturalKey, brandSeen, existing.brandSlugs);
    record(
      'brands',
      index,
      status,
      naturalKey,
      trimmed(row.name) || slug || `brand[${index}]`,
      issues,
      row,
    );
  });

  // Stacks ----------------------------------------------------------------
  const stackSeen = new Set<string>();
  (pack.stacks ?? []).forEach((row: StackPackRow, index) => {
    const issues: RowIssue[] = [];
    checkRequired(row.name, 'name', issues);
    checkRequired(row.description, 'description', issues);

    const distinctSlugs: string[] = [];
    if (!Array.isArray(row.components)) {
      issues.push({
        path: 'components',
        message: 'components must be an array of substance slugs',
        severity: 'error',
      });
    } else {
      row.components.forEach((c) => {
        const cSlug = slugify(c);
        if (cSlug && !distinctSlugs.includes(cSlug)) distinctSlugs.push(cSlug);
        const resolvable =
          cSlug && (packSubstanceSlugs.has(cSlug) || existing.substanceSlugs.has(cSlug));
        if (!resolvable) {
          issues.push({
            path: 'components',
            message: `unknown component substance: ${c}`,
            severity: 'error',
          });
        }
      });
      if (distinctSlugs.length < 2 || distinctSlugs.length > 10) {
        issues.push({
          path: 'components',
          message: `stacks need between 2 and 10 distinct components (has ${distinctSlugs.length})`,
          severity: 'error',
        });
      }
    }

    const hasError = issues.some((i) => i.severity === 'error');
    const naturalKey = distinctSlugs.length ? [...distinctSlugs].sort().join('+') : null;
    const status = classifyStatus(hasError, naturalKey, stackSeen, existing.stackSignatures);
    record(
      'stacks',
      index,
      status,
      naturalKey,
      trimmed(row.name) || `stack[${index}]`,
      issues,
      row,
    );
  });

  // Sources ----------------------------------------------------------------
  const sourceSeen = new Set<string>();
  (pack.sources ?? []).forEach((row: SourcePackRow, index) => {
    const issues: RowIssue[] = [];
    checkRequired(row.title, 'title', issues);
    checkEnum(row.source_type, RESEARCH_SOURCE_TYPES_V1, 'source_type', issues, true);
    if (!isFourDigitYear(row.year)) {
      issues.push({ path: 'year', message: `invalid year: ${row.year}`, severity: 'error' });
    }
    (row.substances ?? []).forEach((ref) => {
      const refSlug = slugify(ref);
      if (!refSlug || !(packSubstanceSlugs.has(refSlug) || existing.substanceSlugs.has(refSlug))) {
        issues.push({
          path: 'substances',
          message: `unknown substance: ${ref}`,
          severity: 'warning',
        });
      }
    });
    const hasError = issues.some((i) => i.severity === 'error');
    const naturalKey = sourceKeyVariants(row)[0] ?? null;
    const status = classifyStatus(hasError, naturalKey, sourceSeen, existing.sourceKeys);
    record(
      'sources',
      index,
      status,
      naturalKey,
      trimmed(row.title) || `source[${index}]`,
      issues,
      row,
    );
  });

  // Findings ----------------------------------------------------------------
  const findingSeen = new Set<string>();
  (pack.findings ?? []).forEach((row: FindingPackRow, index) => {
    const issues: RowIssue[] = [];
    const subSlug = slugify(row.substance_slug);
    if (!subSlug) {
      issues.push({
        path: 'substance_slug',
        message: 'substance_slug is required',
        severity: 'error',
      });
    } else if (!(packSubstanceSlugs.has(subSlug) || existing.substanceSlugs.has(subSlug))) {
      // The server rejects findings for unknown substances, so surface this
      // before import instead of letting the row fail server-side.
      issues.push({
        path: 'substance_slug',
        message: `unknown substance: ${row.substance_slug}`,
        severity: 'error',
      });
    }
    checkRequired(row.endpoint, 'endpoint', issues);
    checkEnum(row.direction, FINDING_DIRECTIONS_V1, 'direction', issues, true);
    checkRequired(row.finding_summary, 'finding_summary', issues);
    checkEnum(row.dose_unit, DOSE_UNITS_V1, 'dose_unit', issues, false);
    checkEnum(row.study_type, FINDING_STUDY_TYPES_V1, 'study_type', issues, false);

    const refKeys = findingSourceRefKeys(row);
    if (refKeys.length === 0) {
      issues.push({
        path: 'source',
        message: 'one of source_pmid, source_doi, or source_url is required',
        severity: 'error',
      });
    } else if (!refKeys.some((k) => packSourceAllKeys.has(k) || existing.sourceKeys.has(k))) {
      issues.push({
        path: 'source',
        message: 'finding does not resolve to a known source (pmid/doi/url)',
        severity: 'error',
      });
    }

    const hasError = issues.some((i) => i.severity === 'error');
    const naturalKey = [
      refKeys[0] ?? '',
      subSlug,
      trimmed(row.endpoint).toLowerCase(),
      trimmed(row.population).toLowerCase(),
      row.dose_amount ?? '',
      trimmed(row.dose_unit).toLowerCase(),
      trimmed(row.direction),
    ].join('|');
    const status = classifyStatus(hasError, naturalKey, findingSeen, existing.findingKeys);
    record(
      'findings',
      index,
      status,
      naturalKey,
      `${trimmed(row.endpoint) || 'finding'} (${row.substance_slug || '?'})`,
      issues,
      row,
    );
  });

  const anyImportable = ENTITY_ORDER.some((e) => counts[e].ready > 0 || counts[e].exists > 0);
  const ok = packIssues.every((i) => i.severity !== 'error') && anyImportable;

  return { packIssues, rows, counts, ok };
}
