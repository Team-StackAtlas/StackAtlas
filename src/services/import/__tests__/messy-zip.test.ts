// End-to-end regression test for the real-world admin workflow: drop one
// messy ZIP containing a research-agent package, loose markdown documents,
// and junk (images, PDFs, system files) — everything usable must come out
// parsed and categorized, and nothing may surface as an error.

import { describe, it, expect } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { parseImportFiles } from '../parse';
import type { SubstanceCatalogEntry } from '../markdown';

const CATALOG: SubstanceCatalogEntry[] = [
  { slug: 'magnesium-glycinate', name: 'Magnesium Glycinate' },
  { slug: 'ashwagandha', name: 'Ashwagandha' },
];

function messyZip(): File {
  const substances = JSON.stringify([
    { canonical_name: 'Magnesium Glycinate', category: 'Mineral', description: 'A chelated form of magnesium.' },
  ]);
  const brands = JSON.stringify([
    {
      brand_name: 'Thorne',
      official_website: 'https://www.thorne.com/',
      sources: [
        { title: 'Thorne testing overview', source_type: 'brand website', url: 'https://www.thorne.com/quality' },
      ],
    },
  ]);
  const evidence = JSON.stringify([
    {
      title: 'Magnesium and sleep quality: a randomized controlled trial',
      evidence_type: 'clinical trial',
      url: 'https://example.org/rct',
      applies_to: { substance: 'Magnesium Glycinate' },
    },
  ]);
  const markdown = [
    '# Ashwagandha',
    '',
    'A double-blind human study of ashwagandha root extract for stress.',
    'https://example.org/ashwagandha-study',
  ].join('\n');

  return new File(
    [
      zipSync({
        'package/substances.json': strToU8(substances),
        'package/brands.json': strToU8(brands),
        'package/evidence.json': strToU8(evidence),
        'docs/ashwagandha-study.md': strToU8(markdown),
        'junk/photo.png': strToU8('\x89PNG junk'),
        'junk/paper.pdf': strToU8('%PDF junk'),
        '__MACOSX/._substances.json': strToU8('resource fork'),
        '.DS_Store': strToU8('finder junk'),
      }),
    ],
    'research-drop.zip',
  );
}

describe('messy real-world zip drop', () => {
  it('parses the package, categorizes the markdown, and reports no errors', async () => {
    const result = await parseImportFiles([messyZip()], CATALOG);

    // Nothing usable may error out.
    expect(result.files.filter((f) => f.status === 'error')).toEqual([]);
    expect(result.issues.filter((i) => i.severity === 'error')).toEqual([]);

    // Junk is skipped (not silently swallowed, not fatal); system files never appear.
    const skipped = result.files.filter((f) => f.status === 'skipped').map((f) => f.path);
    expect(skipped).toContain('junk/photo.png');
    expect(skipped).toContain('junk/paper.pdf');
    expect(result.files.some((f) => f.path.includes('__MACOSX') || f.path.includes('.DS_Store'))).toBe(false);

    // Research package converted: substance + brand + its linked source.
    expect(result.pack.substances?.map((s) => s.slug)).toContain('magnesium-glycinate');
    expect(result.pack.brands?.map((b) => b.slug)).toContain('thorne');

    const sources = result.pack.sources ?? [];
    // Brand-level source is linked to its brand, not orphaned.
    const brandDoc = sources.find((s) => s.title === 'Thorne testing overview');
    expect(brandDoc?.brands).toEqual(['thorne']);
    expect(brandDoc?.source_type).toBe('brand_or_vendor_document');

    // Evidence rows get a real category and a substance link.
    const rct = sources.find((s) => s.title.startsWith('Magnesium and sleep quality'));
    expect(rct?.source_type).toBe('human_study');
    expect(rct?.substances).toEqual(['magnesium-glycinate']);

    // Markdown gets a substance link from the catalog and an inferred type
    // (not dumped into "other").
    const md = sources.find((s) => s.original_filename === 'ashwagandha-study.md');
    expect(md?.substances).toEqual(['ashwagandha']);
    expect(md?.source_type).toBe('human_study');
  });
});
