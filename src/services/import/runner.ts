// Executes a validated DataPack against the import RPCs from
// supabase/migrations/0016_research_import_system.sql, plus read-only helpers
// for the admin UI (import history, source library, findings queue).

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ENTITY_ORDER,
  type DataPack,
  type EntityImportResult,
  type EntityKind,
  type ExistingKeys,
  type ImportBatchRecord,
  type ImportRunResult,
  type PackValidationReport,
} from './types';
import { slugify, sourceKeyVariants } from './validate';
import type { SubstanceCatalogEntry } from './markdown';

const CHUNK_SIZE = 500;

const RPC_BY_ENTITY: Record<EntityKind, string> = {
  substances: 'admin_import_substances',
  brands: 'admin_import_brands',
  stacks: 'admin_import_stacks',
  sources: 'admin_import_sources',
  findings: 'admin_import_findings',
};

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function fetchExistingKeys(client: SupabaseClient): Promise<ExistingKeys> {
  // external_ref lands with the importer_phase2 migration; retry without the
  // column so exists-detection keeps working until it's applied.
  const fetchSources = async () => {
    const withRef = await client
      .from('research_sources')
      .select('external_ref, pmid, doi, url, title, year, content_hash');
    if (withRef.error && /external_ref/.test(withRef.error.message)) {
      return client.from('research_sources').select('pmid, doi, url, title, year, content_hash');
    }
    return withRef;
  };
  const [substancesRes, aliasesRes, brandsRes, stacksRes, sourcesRes] = await Promise.all([
    client.from('substances').select('slug, name'),
    client.from('substance_aliases').select('alias'),
    client.from('brands').select('slug'),
    client.from('stacks').select('component_signature'),
    fetchSources(),
  ]);
  if (substancesRes.error) throw substancesRes.error;
  if (aliasesRes.error) throw aliasesRes.error;
  if (brandsRes.error) throw brandsRes.error;
  if (stacksRes.error) throw stacksRes.error;
  if (sourcesRes.error) throw sourcesRes.error;

  // The server resolves substance references by slug, alias, or exact name
  // (import_resolve_substance), so the preview's known-substance set includes
  // slugified names and aliases too.
  const substanceSlugs = new Set<string>();
  (substancesRes.data ?? []).forEach((r: any) => {
    if (r.slug) substanceSlugs.add(r.slug);
    if (r.name) substanceSlugs.add(slugify(r.name));
  });
  (aliasesRes.data ?? []).forEach((r: any) => {
    if (r.alias) substanceSlugs.add(slugify(r.alias));
  });
  const brandSlugs = new Set<string>((brandsRes.data ?? []).map((r: any) => r.slug));
  const stackSignatures = new Set<string>(
    (stacksRes.data ?? []).map((r: any) => r.component_signature),
  );

  const sourceKeys = new Set<string>();
  (sourcesRes.data ?? []).forEach((row: any) => {
    sourceKeyVariants(row).forEach((k) => sourceKeys.add(k));
  });

  return {
    substanceSlugs,
    brandSlugs,
    stackSignatures,
    sourceKeys,
    findingKeys: new Set<string>(),
  };
}

// Substances + their aliases, grouped, for Markdown heading-to-substance
// matching (see markdown.ts). Distinct from fetchExistingKeys's flattened
// slug set, which loses the name/alias -> slug association this needs.
export async function fetchSubstanceCatalog(client: SupabaseClient): Promise<SubstanceCatalogEntry[]> {
  const { data, error } = await client
    .from('substances')
    .select('slug, name, substance_aliases(alias)');
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    slug: row.slug,
    name: row.name,
    aliases: ((row.substance_aliases ?? []) as { alias: string }[])
      .map((a) => a.alias)
      .filter(Boolean),
  }));
}

function emptyResult(entity: EntityKind): EntityImportResult {
  return { entity, attempted: 0, inserted: 0, updated: 0, skipped: 0, errors: [], warnings: [] };
}

export async function runImport(
  client: SupabaseClient,
  pack: DataPack,
  report: PackValidationReport,
): Promise<ImportRunResult> {
  // Importable row indices per entity, in original pack-array order.
  const importableIndex: Record<EntityKind, number[]> = {
    substances: [],
    brands: [],
    stacks: [],
    sources: [],
    findings: [],
  };
  report.rows.forEach((row) => {
    if (row.status === 'ready' || row.status === 'exists') {
      importableIndex[row.entity].push(row.index);
    }
  });

  const totalImportableRows = ENTITY_ORDER.reduce((sum, e) => sum + importableIndex[e].length, 0);

  const { data: batchId, error: batchError } = await client.rpc('admin_create_import_batch', {
    p_meta: {
      label: pack.label ?? null,
      schema_version: String(pack.schema_version ?? 1),
      generated_by: pack.generated_by ?? null,
      row_count: String(totalImportableRows),
    },
  });
  if (batchError) throw batchError;

  const results: EntityImportResult[] = [];
  let substancesFailed = false;

  for (const entity of ENTITY_ORDER) {
    const result = emptyResult(entity);
    const indices = importableIndex[entity];
    result.attempted = indices.length;

    if (indices.length > 0 && !(entity !== 'substances' && substancesFailed)) {
      const sourceRows = (pack[entity] ?? []) as unknown as Record<string, unknown>[];
      const rowsToSend = indices.map((i) => sourceRows[i]);
      const chunks = chunk(rowsToSend, CHUNK_SIZE);

      let offset = 0;
      for (const rowsChunk of chunks) {
        const chunkOffset = offset;
        offset += rowsChunk.length;
        try {
          const { data, error } = await client.rpc(RPC_BY_ENTITY[entity], {
            p_batch_id: batchId,
            p_rows: rowsChunk,
          });
          if (error) throw error;
          const payload = data as {
            inserted?: number;
            updated?: number;
            skipped?: number;
            errors?: { index: number; message: string }[];
            warnings?: { index: number; message: string }[];
          };
          result.inserted += payload.inserted ?? 0;
          result.updated += payload.updated ?? 0;
          result.skipped += payload.skipped ?? 0;
          (payload.errors ?? []).forEach((e) => {
            result.errors.push({ index: indices[chunkOffset + e.index], message: e.message });
          });
          (payload.warnings ?? []).forEach((w) => {
            result.warnings.push({ index: indices[chunkOffset + w.index], message: w.message });
          });
        } catch (err) {
          result.errors.push({ index: -1, message: errorMessage(err) });
          if (entity === 'substances') substancesFailed = true;
        }
      }
    }

    // Attach dataset-stable IDs (e.g. "S0001") to the sources just imported.
    // Best-effort by design: before the importer_phase2 migration the RPC
    // doesn't exist and this records a warning instead of failing the batch.
    if (entity === 'sources' && !substancesFailed) {
      const sourceRows = (pack.sources ?? []) as unknown as Record<string, unknown>[];
      const refRows = indices
        .map((i) => sourceRows[i])
        .filter((row) => typeof row?.external_ref === 'string' && row.external_ref)
        .map((row) => ({
          external_ref: row.external_ref,
          content_hash: row.content_hash ?? null,
          pmid: row.pmid ?? null,
          doi: row.doi ?? null,
          url: row.url ?? null,
        }));
      if (refRows.length > 0) {
        try {
          const { error } = await client.rpc('admin_set_source_external_refs', { p_rows: refRows });
          if (error) throw error;
        } catch (err) {
          result.warnings.push({
            index: -1,
            message: `external refs not attached (apply the importer_phase2 migration): ${errorMessage(err)}`,
          });
        }
      }
    }

    if (entity === 'brands' && !substancesFailed) {
      const substanceIndices = importableIndex.substances;
      const substanceRows = (pack.substances ?? []) as unknown as Record<string, unknown>[];
      const pairs = substanceIndices
        .map((i) => substanceRows[i])
        .filter(
          (row) => typeof row.most_popular_brand_slug === 'string' && row.most_popular_brand_slug,
        )
        .map((row) => ({ substance_slug: row.slug, brand_slug: row.most_popular_brand_slug }));
      if (pairs.length > 0) {
        try {
          const { error } = await client.rpc('admin_link_popular_brands', { p_rows: pairs });
          if (error) throw error;
        } catch (err) {
          result.errors.push({ index: -1, message: `link_popular_brands: ${errorMessage(err)}` });
        }
      }
    }

    results.push(result);
  }

  const totals = results.reduce(
    (acc, r) => {
      acc.imported += r.inserted + r.updated;
      acc.skipped += r.skipped;
      acc.errors += r.errors.length;
      return acc;
    },
    { imported: 0, skipped: 0, errors: 0 },
  );

  const entityCounts: Record<string, unknown> = {};
  results.forEach((r) => {
    entityCounts[r.entity] = {
      inserted: r.inserted,
      updated: r.updated,
      skipped: r.skipped,
      errors: r.errors.length,
    };
  });

  const { error: finalizeError } = await client.rpc('admin_finalize_import_batch', {
    p_batch_id: batchId,
    p_counts: {
      imported_count: String(totals.imported),
      skipped_count: String(totals.skipped),
      error_count: String(totals.errors),
      entity_counts: entityCounts,
    },
  });
  if (finalizeError) throw finalizeError;

  return {
    batchId: batchId as string,
    results,
    ok: results.every((r) => r.errors.length === 0),
  };
}

export async function listImportBatches(client: SupabaseClient): Promise<ImportBatchRecord[]> {
  const { data, error } = await client
    .from('research_import_batches')
    .select(
      'id, label, schema_version, generated_by, row_count, imported_count, skipped_count, error_count, entity_counts, notes, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    label: row.label ?? null,
    schemaVersion: row.schema_version ?? null,
    generatedBy: row.generated_by ?? null,
    rowCount: row.row_count,
    importedCount: row.imported_count,
    skippedCount: row.skipped_count,
    errorCount: row.error_count,
    entityCounts: row.entity_counts ?? null,
    notes: row.notes ?? null,
    createdAt: row.created_at,
  }));
}

// Removes everything a batch created: its findings, source links, and newly
// created sources (owner-only, audit-logged server-side). Catalog rows are
// not affected — correct those by re-importing.
export async function revertImportBatch(client: SupabaseClient, batchId: string): Promise<void> {
  const { error } = await client.rpc('admin_revert_import_batch', { p_batch_id: batchId });
  if (error) throw error;
}

export interface SourceLibraryEntry {
  id: string;
  title: string;
  url: string | null;
  pmid: string | null;
  doi: string | null;
  year: number | null;
  journalOrSite: string | null;
  authors: string | null;
  sourceType: string;
  abstract: string | null;
  createdAt: string;
  substances: { id: string; name: string; slug: string }[];
}

export async function listSourceLibrary(client: SupabaseClient): Promise<SourceLibraryEntry[]> {
  const { data, error } = await client
    .from('research_sources')
    .select(
      'id, title, url, pmid, doi, year, journal_or_site, authors, abstract, source_type, created_at, research_source_substances(substances(id, name, slug))',
    )
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    url: row.url ?? null,
    pmid: row.pmid ?? null,
    doi: row.doi ?? null,
    year: row.year ?? null,
    journalOrSite: row.journal_or_site ?? null,
    authors: row.authors ?? null,
    sourceType: row.source_type,
    abstract: row.abstract ?? null,
    createdAt: row.created_at,
    substances: (row.research_source_substances ?? [])
      .map((link: any) => link.substances)
      .filter(Boolean)
      .map((s: any) => ({ id: s.id, name: s.name, slug: s.slug })),
  }));
}

export type SourceEditPatch = Partial<{
  title: string;
  url: string | null;
  pmid: string | null;
  doi: string | null;
  year: number | null;
  journalOrSite: string | null;
  authors: string | null;
  abstract: string | null;
  sourceType: string;
}>;

export async function editSource(
  client: SupabaseClient,
  sourceId: string,
  patch: SourceEditPatch,
): Promise<SourceLibraryEntry> {
  const p_patch: Record<string, unknown> = {};
  if ('title' in patch) p_patch.title = patch.title;
  if ('url' in patch) p_patch.url = patch.url;
  if ('pmid' in patch) p_patch.pmid = patch.pmid;
  if ('doi' in patch) p_patch.doi = patch.doi;
  if ('year' in patch) p_patch.year = patch.year;
  if ('journalOrSite' in patch) p_patch.journal_or_site = patch.journalOrSite;
  if ('authors' in patch) p_patch.authors = patch.authors;
  if ('abstract' in patch) p_patch.abstract = patch.abstract;
  if ('sourceType' in patch) p_patch.source_type = patch.sourceType;

  const { data, error } = await client.rpc('admin_edit_source', {
    p_source_id: sourceId,
    p_patch,
  });
  if (error) throw error;
  const row = data as any;
  return {
    id: row.id,
    title: row.title,
    url: row.url ?? null,
    pmid: row.pmid ?? null,
    doi: row.doi ?? null,
    year: row.year ?? null,
    journalOrSite: row.journal_or_site ?? null,
    authors: row.authors ?? null,
    sourceType: row.source_type,
    abstract: row.abstract ?? null,
    createdAt: row.created_at,
    substances: [],
  };
}

export interface FindingEntry {
  id: string;
  endpoint: string;
  direction: string;
  findingSummary: string;
  population: string | null;
  doseAmount: number | null;
  doseUnit: string | null;
  studyType: string | null;
  reviewStatus: string;
  createdAt: string;
  substance: { name: string; slug: string } | null;
  sourceTitle: string | null;
}

export async function listFindings(client: SupabaseClient): Promise<FindingEntry[]> {
  const { data, error } = await client
    .from('research_findings')
    .select(
      'id, endpoint, direction, finding_summary, population, dose_amount, dose_unit, study_type, review_status, created_at, substances(name, slug), research_sources(title)',
    )
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    endpoint: row.endpoint,
    direction: row.direction,
    findingSummary: row.finding_summary,
    population: row.population ?? null,
    doseAmount: row.dose_amount ?? null,
    doseUnit: row.dose_unit ?? null,
    studyType: row.study_type ?? null,
    reviewStatus: row.review_status,
    createdAt: row.created_at,
    substance: row.substances ? { name: row.substances.name, slug: row.substances.slug } : null,
    sourceTitle: row.research_sources?.title ?? null,
  }));
}
