// Canonical import/seed format + dataset validation.
//
// An ImportDataset is the single, structured shape that all seed/import data is
// expressed in. `validateDataset` runs the full rule set and returns a report
// (counts + issues) — used as a dry run before any write, and as the basis of
// the operator status view.

import {
  type ValidationIssue,
  checkClassification,
  checkCategoryRoutes,
  checkInVocabulary,
  checkStackComponentCount,
  checkSourceUrl,
  checkSingleValueField,
  findDuplicates,
  ALLOWED_TYPE_TAGS,
  ALLOWED_ADMINISTRATION_METHODS,
  ALLOWED_MARKERS,
} from '../validation';
import type { ObjectType, SourceSection, SourceType } from '../types';

export interface SubstanceImport {
  slug: string;
  name: string;
  classification: string;
  description: string;
  categoryRoutes: string[]; // "Domain:Category"
  typeTags: string[];
  administrationMethods: string[];
  markers?: string[];
  averageDosage?: string;
  lengthOfCycle?: string;
  toleranceBuildup?: string;
  riskLevel?: string;
  formula?: string;
}

export interface BrandProductImport {
  name: string;
  substanceSlug?: string;
  ingredients?: { name: string; amount?: string }[];
  healthLabels?: string[];
}

export interface BrandImport {
  slug: string;
  name: string;
  description?: string;
  shippingReliability?: number;
  contaminationReports?: number;
  products?: BrandProductImport[];
}

export interface StackImport {
  name: string;
  description: string;
  componentSlugs: string[];
}

export interface SourceImport {
  targetType: ObjectType;
  targetRef: string; // slug or natural key of the target
  section?: SourceSection;
  claim?: string;
  title: string;
  url: string;
  sourceType: SourceType;
  publisher?: string;
  accessedAt?: string;
}

export interface ImportDataset {
  substances: SubstanceImport[];
  brands: BrandImport[];
  stacks: StackImport[];
  sources?: SourceImport[];
}

export interface ImportReport {
  ok: boolean;
  counts: Record<string, number>;
  issues: ValidationIssue[];
}

function stackSignature(componentSlugs: string[]): string {
  return [...componentSlugs].map((s) => s.trim().toLowerCase()).sort().join('+');
}

export function validateDataset(dataset: ImportDataset): ImportReport {
  const issues: ValidationIssue[] = [];
  const { substances, brands, stacks, sources = [] } = dataset;

  const substanceSlugs = new Set(substances.map((s) => s.slug.trim().toLowerCase()));

  // Duplicates.
  issues.push(...findDuplicates(substances.map((s) => s.slug), 'substances'));
  issues.push(...findDuplicates(brands.map((b) => b.slug), 'brands'));
  issues.push(...findDuplicates(stacks.map((s) => stackSignature(s.componentSlugs)), 'stacks'));

  // Substances.
  substances.forEach((s, i) => {
    const p = `substances[${i}]`;
    issues.push(...checkSingleValueField(s.name, `${p}.name`));
    issues.push(...checkClassification(s.classification, `${p}.classification`));
    issues.push(...checkCategoryRoutes(s.categoryRoutes, `${p}.categoryRoutes`));
    issues.push(...checkInVocabulary(s.typeTags, ALLOWED_TYPE_TAGS, `${p}.typeTags`));
    issues.push(
      ...checkInVocabulary(s.administrationMethods, ALLOWED_ADMINISTRATION_METHODS, `${p}.administrationMethods`),
    );
    if (s.markers) issues.push(...checkInVocabulary(s.markers, ALLOWED_MARKERS, `${p}.markers`));
  });

  // Brands.
  brands.forEach((b, i) => {
    const p = `brands[${i}]`;
    issues.push(...checkSingleValueField(b.name, `${p}.name`));
    (b.products ?? []).forEach((product, j) => {
      if (product.substanceSlug && !substanceSlugs.has(product.substanceSlug.trim().toLowerCase())) {
        issues.push({
          code: 'unknown_reference',
          message: `Brand product references unknown substance "${product.substanceSlug}"`,
          path: `${p}.products[${j}].substanceSlug`,
        });
      }
    });
  });

  // Stacks.
  stacks.forEach((s, i) => {
    const p = `stacks[${i}]`;
    issues.push(...checkSingleValueField(s.name, `${p}.name`));
    issues.push(...checkStackComponentCount(s.componentSlugs.length, `${p}.componentSlugs`));
    s.componentSlugs.forEach((slug, j) => {
      if (!substanceSlugs.has(slug.trim().toLowerCase())) {
        issues.push({
          code: 'unknown_reference',
          message: `Stack component references unknown substance "${slug}"`,
          path: `${p}.componentSlugs[${j}]`,
        });
      }
    });
  });

  // Sources.
  sources.forEach((src, i) => {
    issues.push(...checkSourceUrl(src.url, `sources[${i}].url`));
  });

  return {
    ok: issues.length === 0,
    counts: {
      substances: substances.length,
      brands: brands.length,
      stacks: stacks.length,
      sources: sources.length,
    },
    issues,
  };
}
