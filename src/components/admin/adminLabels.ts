// Human-readable label maps for the admin research tools. The import pack
// contract (src/services/import/types.ts) and the database both store these
// as snake_case enums; admin copy must never show raw snake_case per the
// project's language rules, so every enum gets a mapped label with a
// title-cased fallback for anything unrecognized.
import type { BadgeTone } from './Badge';

function titleCase(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  human_study: 'Human study',
  review_or_meta_analysis: 'Review / meta-analysis',
  animal_study: 'Animal study',
  in_vitro_or_mechanistic: 'In vitro / mechanistic',
  official_label_or_document: 'Official label / document',
  brand_or_vendor_document: 'Brand / vendor document',
  coa_or_testing_document: 'COA / testing document',
  practitioner_source: 'Practitioner source',
  community_or_influencer_mention: 'Community / influencer mention',
  other: 'Other',
};
export function sourceTypeLabel(type: string): string {
  return SOURCE_TYPE_LABELS[type] ?? titleCase(type);
}

const FINDING_DIRECTION_LABELS: Record<string, string> = {
  increased: 'Increased',
  decreased: 'Decreased',
  no_clear_change: 'No clear change',
  mixed: 'Mixed',
  unclear: 'Unclear',
};
export function findingDirectionLabel(direction: string): string {
  return FINDING_DIRECTION_LABELS[direction] ?? titleCase(direction);
}
export function findingDirectionTone(direction: string): BadgeTone {
  switch (direction) {
    case 'increased':
      return 'green';
    case 'decreased':
      return 'blue';
    case 'mixed':
      return 'purple';
    case 'no_clear_change':
      return 'slate';
    default:
      return 'amber';
  }
}

const STUDY_TYPE_LABELS: Record<string, string> = {
  human_rct: 'Human RCT',
  human_observational: 'Human observational',
  review: 'Review',
  meta_analysis: 'Meta-analysis',
  animal: 'Animal',
  in_vitro: 'In vitro',
  mechanistic: 'Mechanistic',
  official_document: 'Official document',
  other: 'Other',
};
export function studyTypeLabel(type: string): string {
  return STUDY_TYPE_LABELS[type] ?? titleCase(type);
}

export function reviewStatusLabel(status: string): string {
  if (status === 'pending_review') return 'Pending review';
  return titleCase(status);
}
export function reviewStatusTone(status: string): BadgeTone {
  if (status === 'pending_review') return 'amber';
  if (status === 'approved') return 'green';
  if (status === 'rejected') return 'red';
  return 'slate';
}

const ROW_STATUS_LABELS: Record<string, string> = {
  ready: 'Ready',
  exists: 'Update',
  duplicate_in_pack: 'Duplicate',
  invalid: 'Invalid',
};
export function rowStatusLabel(status: string): string {
  return ROW_STATUS_LABELS[status] ?? titleCase(status);
}
export function rowStatusTone(status: string): BadgeTone {
  switch (status) {
    case 'ready':
      return 'green';
    case 'exists':
      return 'blue';
    case 'duplicate_in_pack':
      return 'amber';
    case 'invalid':
      return 'red';
    default:
      return 'slate';
  }
}

const FILE_KIND_LABELS: Record<string, string> = {
  json: 'JSON pack',
  csv: 'CSV sources',
  markdown: 'Markdown',
  zip: 'ZIP archive',
  unsupported: 'Unsupported',
};
export function fileKindLabel(kind: string): string {
  return FILE_KIND_LABELS[kind] ?? titleCase(kind);
}
export function fileKindTone(kind: string): BadgeTone {
  switch (kind) {
    case 'json':
      return 'blue';
    case 'csv':
      return 'blue';
    case 'markdown':
      return 'purple';
    case 'zip':
      return 'slate';
    default:
      return 'red';
  }
}

const FILE_STATUS_LABELS: Record<string, string> = {
  parsed: 'Parsed',
  skipped: 'Skipped',
  error: 'Error',
};
export function fileStatusLabel(status: string): string {
  return FILE_STATUS_LABELS[status] ?? titleCase(status);
}
export function fileStatusTone(status: string): BadgeTone {
  switch (status) {
    case 'parsed':
      return 'green';
    case 'skipped':
      return 'amber';
    case 'error':
      return 'red';
    default:
      return 'slate';
  }
}

const ENTITY_LABELS: Record<string, string> = {
  substances: 'Substances',
  brands: 'Brands',
  stacks: 'Stacks',
  sources: 'Sources',
  findings: 'Findings',
};
export function entityLabel(entity: string): string {
  return ENTITY_LABELS[entity] ?? titleCase(entity);
}
