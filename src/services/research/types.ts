export const SOURCE_TYPES = [
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

export type SourceType = (typeof SOURCE_TYPES)[number];
export type SubstanceOption = { id: string; name: string; slug?: string | null };
export type SourceLibraryRow = {
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
  research_source_substances?: { notes: string | null; substances: SubstanceOption | null }[];
};
export type SourceForm = {
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
export type PreviewStatus =
  | 'Ready'
  | 'Possible Duplicate'
  | 'Missing Substance'
  | 'Unknown Substance'
  | 'Missing Title'
  | 'Invalid Source Type'
  | 'Invalid Year';
export type PreviewRow = SourceForm & {
  rowNumber: number;
  submittedSubstance: string;
  status: PreviewStatus;
  normalizedType?: SourceType;
  duplicateReason?: string;
};
export type ParseResult =
  | { ok: true; rows: PreviewRow[] }
  | { ok: false; error: string; rows: PreviewRow[] };
export type ImportReadyRow = {
  substance_id: string;
  title: string;
  source_type: SourceType;
  url: string | null;
  pmid: string | null;
  doi: string | null;
  year: number | null;
  journal_or_site: string | null;
  authors: string | null;
  abstract: string | null;
  notes: string | null;
};
export type BulkImportResult = {
  batch_id: string;
  row_count: number;
  imported_count: number;
  reused_count: number;
  linked_count: number;
  skipped_count: number;
};
export type SingleSourceResult = {
  source_id: string;
  source_created: boolean;
  link_created: boolean;
};
