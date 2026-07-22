import type { Substance } from '../data/mockData';

/**
 * Matches short, popular acronyms/short-forms people actually search by:
 * NAC, GABA, DHEA, 5-HTP, EGCG, L-Theanine. Deliberately strict (starts with a
 * capital or digit, all-caps/hyphen body, <=10 chars) so full common names like
 * "Ashwagandha" are NOT treated as acronyms.
 */
const ACRONYM_RE = /^[0-9A-Z][0-9A-Z-]{1,9}$/;

export interface DisplayName {
  /** Canonical / scientific name. */
  primary: string;
  /** A popular acronym to feature ahead of the primary name, if one exists. */
  acronym?: string;
  /** Remaining alternate names, minus the featured acronym. */
  altNames: string[];
}

/**
 * Decides how to surface a substance's names so the popular acronym leads and
 * the scientific name sits alongside it, rather than the raw imported name
 * winning by default.
 */
export function displayName(s: Pick<Substance, 'name' | 'aliases'>): DisplayName {
  const aliases = (s.aliases ?? []).map((a) => a.trim()).filter(Boolean);
  const acronym = aliases.find((a) => a !== s.name && ACRONYM_RE.test(a));
  const altNames = aliases.filter((a) => a !== s.name && a !== acronym);
  return { primary: s.name, acronym, altNames };
}
