// StackAtlas Data Pack v1 — the canonical bulk-import contract.
//
// A pack is a single JSON document, usually generated externally (by a
// cheaper AI model or a script) and imported through Admin → Research.
// Rows reference each other by natural keys (substance slug, source
// pmid/doi/url), never by database UUIDs. Field names are snake_case so a
// pack row can travel into the Postgres import RPCs unchanged.

export const DATA_PACK_KIND = 'stackatlas-data-pack';
export const DATA_PACK_SCHEMA_VERSION = 1;

export const CLASSIFICATIONS_V1 = ['Everyday', 'Clinical', 'Frontier', 'Unknown'] as const;
export const RISK_LEVELS_V1 = ['Low', 'Moderate', 'High'] as const;
export const DOSE_UNITS_V1 = ['mcg', 'mg', 'g', 'IU', 'mL', 'cc'] as const;

export const RESEARCH_SOURCE_TYPES_V1 = [
  'human_study',
  'review_or_meta_analysis',
  'animal_study',
  'in_vitro_or_mechanistic',
  'official_label_or_document',
  'brand_or_vendor_document',
  'coa_or_testing_document',
  'practitioner_source',
  'community_or_influencer_mention',
  'other',
] as const;

export const FINDING_DIRECTIONS_V1 = [
  'increased',
  'decreased',
  'no_clear_change',
  'mixed',
  'unclear',
] as const;

export const FINDING_STUDY_TYPES_V1 = [
  'human_rct',
  'human_observational',
  'review',
  'meta_analysis',
  'animal',
  'in_vitro',
  'mechanistic',
  'official_document',
  'other',
] as const;

export type Classification = (typeof CLASSIFICATIONS_V1)[number];
export type RiskLevel = (typeof RISK_LEVELS_V1)[number];
export type DoseUnit = (typeof DOSE_UNITS_V1)[number];
export type ResearchSourceType = (typeof RESEARCH_SOURCE_TYPES_V1)[number];
export type FindingDirection = (typeof FINDING_DIRECTIONS_V1)[number];
export type FindingStudyType = (typeof FINDING_STUDY_TYPES_V1)[number];

export interface SubstancePackRow {
  slug: string; // natural key, kebab-case
  name: string;
  classification: Classification;
  description: string;
  aliases?: string[];
  origin?: string; // where it comes from
  how_obtained?: string; // how it is obtained
  half_life?: string; // free text, e.g. "3–5 hours"
  reported_dose_range?: string; // safe-language dose text; maps to substances.average_dosage
  length_of_cycle?: string;
  tolerance_buildup?: string;
  risk_level?: RiskLevel;
  formula?: string;
  routes?: { domain: string; category: string }[]; // category routes, e.g. { domain: 'Mind', category: 'Focus' }
  type_tags?: string[]; // labels; vocab rows are created when missing
  administration?: string[]; // labels, e.g. 'Oral'
  markers?: string[]; // labels
  health_risks?: string[];
  subjective_effects?: string[];
  pairings?: string[]; // substance slugs; unknown slugs become row warnings
  most_popular_brand_slug?: string;
}

export interface BrandProductPackRow {
  name: string;
  substance_slug?: string;
  ingredients?: { name: string; amount?: string }[];
  health_labels?: string[];
}

export interface BrandPackRow {
  slug: string; // natural key
  name: string;
  description?: string;
  shipping_reliability?: number; // 0–5, one decimal
  contamination_reports?: number;
  products?: BrandProductPackRow[];
}

export interface StackPackRow {
  name: string;
  description: string;
  components: string[]; // 2–10 substance slugs; sorted set is the natural key
}

export interface SourcePackRow {
  title: string;
  source_type: ResearchSourceType;
  url?: string;
  pmid?: string;
  doi?: string;
  year?: number;
  journal_or_site?: string;
  authors?: string;
  abstract?: string;
  substances?: string[]; // substance slugs to link via research_source_substances
  notes?: string; // stored on the source-substance link
}

export interface FindingPackRow {
  // Exactly one of these must resolve to a source in the same pack or the database.
  source_pmid?: string;
  source_doi?: string;
  source_url?: string;
  substance_slug: string;
  endpoint: string; // what was measured, e.g. 'sleep quality'
  direction: FindingDirection;
  finding_summary: string; // cautious, source-backed phrasing
  population?: string;
  dose_amount?: number;
  dose_unit?: DoseUnit;
  frequency?: string;
  duration?: string;
  study_type?: FindingStudyType;
  limitations?: string;
}

export interface DataPack {
  kind: typeof DATA_PACK_KIND;
  schema_version: typeof DATA_PACK_SCHEMA_VERSION;
  generated_by?: string; // model or tool that produced the pack
  generated_at?: string; // ISO timestamp
  label?: string; // human batch label shown in import history
  substances?: SubstancePackRow[];
  brands?: BrandPackRow[];
  stacks?: StackPackRow[];
  sources?: SourcePackRow[];
  findings?: FindingPackRow[];
}

// ---------------------------------------------------------------------------
// Validation / preview
// ---------------------------------------------------------------------------

export type EntityKind = 'substances' | 'brands' | 'stacks' | 'sources' | 'findings';

export const ENTITY_ORDER: EntityKind[] = ['substances', 'brands', 'stacks', 'sources', 'findings'];

export interface RowIssue {
  path: string; // e.g. 'classification' or 'products[0].name'
  message: string;
  severity: 'error' | 'warning';
}

export type RowStatus =
  | 'ready' // will import
  | 'duplicate_in_pack' // natural key repeated inside the pack; later row skipped
  | 'exists' // natural key already in the database; will update/link, not insert
  | 'invalid'; // has at least one error-severity issue; will be skipped

export interface ValidatedRow {
  entity: EntityKind;
  index: number; // position within its entity array
  status: RowStatus;
  naturalKey: string | null;
  summary: string; // short human label, e.g. substance name or source title
  issues: RowIssue[];
  row: Record<string, unknown>;
}

export interface PackValidationReport {
  packIssues: RowIssue[]; // envelope-level problems (bad kind/schema_version/shape)
  rows: ValidatedRow[];
  counts: Record<EntityKind, { total: number; ready: number; exists: number; invalid: number; duplicates: number }>;
  ok: boolean; // packIssues empty and at least one importable row
}

// Natural keys already present in the database, fetched before validation so
// the preview can distinguish inserts from updates.
export interface ExistingKeys {
  substanceSlugs: Set<string>;
  brandSlugs: Set<string>;
  stackSignatures: Set<string>; // sorted component slugs joined with '+'
  sourceKeys: Set<string>; // 'p:<pmid>' | 'd:<doi>' | 'u:<url>' | 't:<title>|<year>'
  findingKeys: Set<string>;
}

// ---------------------------------------------------------------------------
// Import execution
// ---------------------------------------------------------------------------

export interface EntityImportResult {
  entity: EntityKind;
  attempted: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: { index: number; message: string }[];
  warnings: { index: number; message: string }[];
}

export interface ImportRunResult {
  batchId: string;
  results: EntityImportResult[];
  ok: boolean;
}

export interface ImportBatchRecord {
  id: string;
  label: string | null;
  schemaVersion: number | null;
  generatedBy: string | null;
  rowCount: number;
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  entityCounts: Record<string, unknown> | null;
  createdAt: string;
}
