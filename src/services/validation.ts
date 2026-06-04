// Reusable validation rules for imports/seeding.
// Pure functions, no runtime dependencies — easy to swap for zod later.

import {
  CLASSIFICATIONS,
  TYPE_TAGS,
  MARKERS,
  BEARINGS,
  DOMAIN_STRUCTURE,
  type Classification,
} from '../data/mockData';

export interface ValidationIssue {
  code: string;
  message: string;
  path?: string;
}

// Controlled vocabularies derived from the current data source of truth.
export const ALLOWED_CLASSIFICATIONS: readonly string[] = CLASSIFICATIONS;
export const ALLOWED_TYPE_TAGS: readonly string[] = TYPE_TAGS.map((t) => t.full);
export const ALLOWED_ADMINISTRATION_METHODS: readonly string[] = [
  '👄 Oral',
  '💉 Injectable',
  '🧴 Topical',
  '👅 Sublingual',
];
export const ALLOWED_MARKERS: readonly string[] = MARKERS;
export const ALLOWED_BEARINGS: readonly string[] = BEARINGS;
export const ALLOWED_CATEGORY_ROUTES: readonly string[] = DOMAIN_STRUCTURE.flatMap((d) =>
  d.categories.map((c) => `${d.domain}:${c.name}`),
);

export function isValidClassification(value: string): value is Classification {
  return ALLOWED_CLASSIFICATIONS.includes(value);
}

export function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Flags a scalar field that appears to contain several values stuffed together
 * (e.g. "Oral, Injectable"). Allows "/" so legitimate labels like
 * "Food / Drink" are not flagged.
 */
export function looksMultiValue(value: string): boolean {
  return /[,;|]| and /i.test(value);
}

export function checkInVocabulary(
  values: string[],
  allowed: readonly string[],
  pathPrefix: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  values.forEach((value, i) => {
    if (looksMultiValue(value)) {
      issues.push({
        code: 'multi_value_in_field',
        message: `"${value}" looks like multiple values in one field`,
        path: `${pathPrefix}[${i}]`,
      });
    } else if (!allowed.includes(value)) {
      issues.push({
        code: 'invalid_vocabulary',
        message: `"${value}" is not an allowed value`,
        path: `${pathPrefix}[${i}]`,
      });
    }
  });
  return issues;
}

export function checkClassification(value: string, path: string): ValidationIssue[] {
  return isValidClassification(value)
    ? []
    : [{ code: 'invalid_classification', message: `"${value}" is not a valid classification`, path }];
}

export function checkCategoryRoutes(routes: string[], path: string): ValidationIssue[] {
  return checkInVocabulary(routes, ALLOWED_CATEGORY_ROUTES, path);
}

export function checkStackComponentCount(count: number, path: string): ValidationIssue[] {
  if (count < 2 || count > 10) {
    return [
      {
        code: 'invalid_stack_size',
        message: `Stacks must have between 2 and 10 components (has ${count})`,
        path,
      },
    ];
  }
  return [];
}

export function checkSourceUrl(url: string, path: string): ValidationIssue[] {
  return isValidUrl(url)
    ? []
    : [{ code: 'invalid_source_url', message: `"${url}" is not a valid http(s) URL`, path }];
}

export function checkSingleValueField(value: string, path: string): ValidationIssue[] {
  return looksMultiValue(value)
    ? [{ code: 'multi_value_in_field', message: `"${value}" looks like multiple values in one field`, path }]
    : [];
}

/** Finds duplicate keys in a list and reports each duplicate. */
export function findDuplicates(keys: string[], path: string): ValidationIssue[] {
  const seen = new Set<string>();
  const issues: ValidationIssue[] = [];
  keys.forEach((key, i) => {
    const norm = key.trim().toLowerCase();
    if (seen.has(norm)) {
      issues.push({ code: 'duplicate', message: `Duplicate "${key}"`, path: `${path}[${i}]` });
    } else {
      seen.add(norm);
    }
  });
  return issues;
}
