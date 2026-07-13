import { describe, it, expect } from 'vitest';
import { extractMarkdownSource, type SubstanceCatalogEntry } from '../markdown';

describe('extractMarkdownSource', () => {
  it('extracts title/url/year/authors/abstract/source_type from frontmatter', () => {
    const text = `---
title: A Real Study
url: https://example.com/study
date: 2021-05-01
authors: Jane Doe
source_type: human_study
---

# A Real Study

This is the first paragraph of the body, describing the findings.

Second paragraph, should not be used as the abstract.
`;
    const { source, ambiguous } = extractMarkdownSource('a-real-study.md', text);

    expect(source.title).toBe('A Real Study');
    expect(source.url).toBe('https://example.com/study');
    expect(source.year).toBe(2021);
    expect(source.authors).toBe('Jane Doe');
    expect(source.source_type).toBe('human_study');
    expect(source.abstract).toContain('first paragraph of the body');
    expect(source.substances).toBeUndefined();
    expect(ambiguous).toHaveLength(0);
  });

  it('falls back to the first heading, then the filename, when there is no frontmatter title', () => {
    const withHeading = extractMarkdownSource('notes.md', '# Heading Title\n\nSome text.');
    expect(withHeading.source.title).toBe('Heading Title');

    const withoutHeading = extractMarkdownSource('my-notes-file.md', 'Just some text, no heading.');
    expect(withoutHeading.source.title).toBe('my-notes-file');
  });

  // Scenario 7 (unambiguous): exactly one catalog match auto-links cleanly.
  it('auto-links when exactly one substance matches', () => {
    const catalog: SubstanceCatalogEntry[] = [
      { slug: 'caffeine', name: 'Caffeine', aliases: ['1,3,7-Trimethylxanthine'] },
      { slug: 'l-theanine', name: 'L-Theanine' },
    ];
    const text = '# Caffeine\n\nDiscussion of caffeine effects.';
    const { source, ambiguous } = extractMarkdownSource('caffeine.md', text, catalog);

    expect(source.substances).toEqual(['caffeine']);
    expect(ambiguous).toHaveLength(0);
  });

  // Scenario 7 (ambiguous): heading/title matching 2+ distinct substances is not auto-linked.
  it('does not auto-link when a heading matches multiple distinct substances, and reports it as ambiguous', () => {
    const catalog: SubstanceCatalogEntry[] = [
      { slug: 'vitamin-c-brand-a', name: 'Vitamin C', aliases: ['Ascorbic Acid'] },
      { slug: 'vitamin-c-brand-b', name: 'Vitamin C' },
    ];
    const text = '# Vitamin C\n\nGeneral notes about vitamin C.';
    const { source, ambiguous } = extractMarkdownSource('vitamin-c.md', text, catalog);

    expect(source.substances).toBeUndefined();
    expect(ambiguous).toHaveLength(1);
    expect(ambiguous[0].headingOrTitle).toBe('Vitamin C');
    expect(ambiguous[0].candidates.sort()).toEqual(['vitamin-c-brand-a', 'vitamin-c-brand-b']);
  });

  // Regression guard: when the title IS the first heading (the common case),
  // the ambiguous match must not be double-counted.
  it('does not double-count an ambiguous match when the title equals the first heading', () => {
    const catalog: SubstanceCatalogEntry[] = [
      { slug: 'vitamin-c-brand-a', name: 'Vitamin C' },
      { slug: 'vitamin-c-brand-b', name: 'Vitamin C' },
    ];
    // No frontmatter title, so extractMarkdownSource falls back to the first
    // heading — title and headingMatches[0] are the exact same string.
    const text = '# Vitamin C\n\nGeneral notes about vitamin C.\n\n## Vitamin C\n\nRepeated subheading.';
    const { ambiguous } = extractMarkdownSource('vitamin-c.md', text, catalog);

    // Both the title and the two headings normalize to the same line, so it
    // must be counted once, not two or three times.
    expect(ambiguous).toHaveLength(1);
  });
});
