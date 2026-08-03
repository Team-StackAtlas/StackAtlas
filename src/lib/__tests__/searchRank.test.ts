import { describe, expect, it } from 'vitest';
import { searchRank, sortByRank } from '../searchRank';

describe('searchRank', () => {
  it('ranks exact name matches highest', () => {
    expect(searchRank('caffeine', 'Caffeine')).toBe(100);
  });

  it('ranks name prefix above word prefix above substring', () => {
    const prefix = searchRank('caff', 'Caffeine');
    const wordPrefix = searchRank('theanine', 'L-Theanine');
    const substring = searchRank('affei', 'Caffeine');
    expect(prefix).toBeGreaterThan(wordPrefix);
    expect(wordPrefix).toBeGreaterThan(substring);
    expect(substring).toBeGreaterThan(0);
  });

  it('ranks any name match above any alias match', () => {
    expect(searchRank('theanine', 'L-Theanine')).toBeGreaterThan(
      searchRank('theanine', 'Suntheanine Elite', ['Theanine'])
    );
  });

  it('returns 0 when neither name nor aliases match', () => {
    expect(searchRank('theanine', 'Caffeine')).toBe(0);
    expect(searchRank('', 'Caffeine')).toBe(0);
  });

  it('matches aliases case-insensitively with prefix beating substring', () => {
    expect(searchRank('ashwa', 'Withania somnifera', ['Ashwagandha'])).toBe(50);
    expect(searchRank('somnifera', 'KSM-66', ['Withania somnifera'])).toBe(40);
  });
});

describe('sortByRank', () => {
  it('puts the literal name match first — the "theanine" bug', () => {
    // Every entry "matches" the query somewhere (description, pairings);
    // only L-Theanine matches in its name. It must come first.
    const results = [
      { name: 'Magnesium Glycinate' },
      { name: 'Caffeine' },
      { name: 'Ashwagandha' },
      { name: 'Modafinil' },
      { name: 'L-Theanine' },
    ];
    const sorted = sortByRank(results, (r) => searchRank('theanine', r.name));
    expect(sorted[0].name).toBe('L-Theanine');
  });

  it('is stable: equal ranks keep their original order', () => {
    const results = [{ name: 'B' }, { name: 'A' }, { name: 'C' }];
    const sorted = sortByRank(results, () => 0);
    expect(sorted.map((r) => r.name)).toEqual(['B', 'A', 'C']);
  });
});
