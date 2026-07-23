import { describe, expect, it } from 'vitest';
import { buildGlossaryMatcher } from '../glossaryMatcher';

function matchesIn(text: string, terms: string[]): string[] {
  const matcher = buildGlossaryMatcher(terms);
  if (!matcher) return [];
  return [...text.matchAll(matcher)].map((m) => m[1]);
}

describe('buildGlossaryMatcher', () => {
  it('returns null for an empty term list', () => {
    expect(buildGlossaryMatcher([])).toBeNull();
  });

  it('matches whole terms case-insensitively', () => {
    expect(matchesIn('BIOAVAILABILITY matters, as does bioavailability.', ['Bioavailability'])).toEqual([
      'BIOAVAILABILITY',
      'bioavailability',
    ]);
  });

  it('does not match inside longer words', () => {
    expect(matchesIn('The stacked deck and unstacking.', ['Stack'])).toEqual([]);
  });

  it('treats hyphens as part of a term, not a boundary', () => {
    expect(matchesIn('His half-life is short.', ['Half-Life'])).toEqual(['half-life']);
    // "life" alone inside the hyphenated compound must not match.
    expect(matchesIn('His half-life is short.', ['Life'])).toEqual([]);
  });

  it('prefers the longest term when one contains another', () => {
    const found = matchesIn('Take branched-chain amino acid supplements.', [
      'Amino Acid',
      'Branched-Chain Amino Acid',
    ]);
    expect(found).toEqual(['branched-chain amino acid']);
  });

  it('escapes regex metacharacters in terms', () => {
    expect(matchesIn('Vitamin D3 (cholecalciferol) here.', ['(cholecalciferol)'])).toEqual(['(cholecalciferol)']);
  });
});
