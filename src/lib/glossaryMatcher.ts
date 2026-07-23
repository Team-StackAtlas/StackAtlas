function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Compiles the glossary term matcher: longest terms first (so
 * "Branched-Chain Amino Acid" wins over "Amino Acid"), with boundaries that
 * respect letters, digits, and hyphens (so "Half-Life" and "GABA" match as
 * whole terms, not inside longer words). Returns null when no terms exist.
 */
export function buildGlossaryMatcher(terms: string[]): RegExp | null {
  if (terms.length === 0) return null;
  const alternation = terms
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|');
  return new RegExp(`(?<![A-Za-z0-9-])(${alternation})(?![A-Za-z0-9-])`, 'gi');
}
