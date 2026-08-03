import { describe, it, expect } from 'vitest';
import { inferTypeTag, inferTypeTags } from '../typeTagInference';

describe('inferTypeTags', () => {
  it('returns nothing for empty or unmatched labels', () => {
    expect(inferTypeTags('')).toEqual([]);
    expect(inferTypeTags(null)).toEqual([]);
    expect(inferTypeTags(undefined)).toEqual([]);
    expect(inferTypeTags('xyzzy nonsense')).toEqual([]);
  });

  // Representative taxonomy strings from the imported corpus. These are the
  // labels that used to map to nothing, leaving e.g. one visible
  // Pharmaceutical on the Map.
  it.each([
    ['Pharmaceutical drug', '🏥 Pharmaceutical'],
    ['Prescription medication', '🏥 Pharmaceutical'],
    ['Vitamin', '💊 Supplement'],
    ['Nutrient', '💊 Supplement'],
    ['Amino acid', '💊 Supplement'],
    ['Mineral', '💊 Supplement'],
    ['Hormone', '💊 Supplement'],
    ['Microbial ingredients', '💊 Supplement'],
    ['Botanical extract', '🌿 Botanical'],
    ['Herb', '🌿 Botanical'],
    ['Adaptogen', '🌿 Botanical'],
    ['Peptide drug', '🧬 Peptide'],
    ['GLP-1 peptide', '🧬 Peptide'],
    ['Research compound', '🧪 Research Compound'],
    ['Investigational compound', '🧪 Research Compound'],
    ['Functional food', '🍽️ Food / Drink'],
    ['Beverage', '🍽️ Food / Drink'],
  ])('maps %s to %s', (label, tag) => {
    expect(inferTypeTag(label)).toBe(tag);
  });

  it('prefers the specific tag over Pharmaceutical for peptide drugs', () => {
    expect(inferTypeTags('Peptide drug')[0]).toBe('🧬 Peptide');
  });

  it('does not file research compounds under Supplement via the word "compound"', () => {
    expect(inferTypeTags('Research compound')).toEqual(['🧪 Research Compound']);
  });

  it('exact canonical labels are handled by keyword match too', () => {
    expect(inferTypeTag('Supplement')).toBe('💊 Supplement');
    expect(inferTypeTag('Botanical')).toBe('🌿 Botanical');
  });
});
