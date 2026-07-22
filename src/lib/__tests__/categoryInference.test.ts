import { describe, it, expect } from 'vitest';
import { inferCanonicalCategories } from '../categoryInference';
import { BEARING_CATEGORIES } from '../bearings';

describe('inferCanonicalCategories', () => {
  it('returns nothing for empty or unmatched signals', () => {
    expect(inferCanonicalCategories([])).toEqual([]);
    expect(inferCanonicalCategories([undefined, null, ''])).toEqual([]);
    expect(inferCanonicalCategories(['xyzzy nonsense'])).toEqual([]);
  });

  it('only ever returns real canonical category names', () => {
    const valid = new Set(BEARING_CATEGORIES.map((c) => c.name));
    const out = inferCanonicalCategories(['cognition', 'bone health', 'sleep', 'blood pressure']);
    for (const name of out) expect(valid.has(name)).toBe(true);
  });

  it('returns results in canonical order', () => {
    // Digestive (8th) before Heart (9th) before Beauty (12th) in BEARING_CATEGORIES order.
    const out = inferCanonicalCategories(['skin', 'microbiome', 'blood pressure']);
    expect(out).toEqual(['Digestive Health', 'Heart Health', 'Beauty & Skin']);
  });

  it('caps breadth so one substance does not blanket every card', () => {
    const out = inferCanonicalCategories(
      ['cognition', 'sleep', 'exercise', 'aging', 'mood', 'glucose', 'thyroid', 'gut'],
      3,
    );
    expect(out.length).toBe(3);
  });

  // Representative research-area strings from the imported corpus map to the
  // categories a user would expect from the big category cards.
  it.each([
    ['cognition', 'Cognition'],
    ['neurologic and cognitive research', 'Cognition'],
    ['sleep quality', 'Recovery'],
    ['jet lag', 'Recovery'],
    ['exercise performance', 'Performance'],
    ['muscle protein synthesis', 'Performance'],
    ['stress and mood', 'Mood & Stress'],
    ['glucose metabolism', 'Metabolic Health'],
    ['thyroid hormone synthesis', 'Hormonal Health'],
    ['microbiome', 'Digestive Health'],
    ['blood pressure', 'Heart Health'],
    ['cardiovascular markers', 'Heart Health'],
    ['bone health', 'Joint & Mobility'],
    ['collagen and connective tissue', 'Joint & Mobility'],
    ['wound healing', 'Pain & Injury'],
    ['hair and nail outcomes', 'Beauty & Skin'],
    ['oxidative stress', 'Longevity'],
    ['iron status and deficiency', 'Heart Health'],
    ['anemia', 'Heart Health'],
    ['pregnancy nutrition', 'Hormonal Health'],
  ])('maps research area %j to include %j', (area, expected) => {
    expect(inferCanonicalCategories([area])).toContain(expected);
  });
});
