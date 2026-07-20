import { describe, it, expect } from 'vitest';
import { convertResearchPackage, isResearchPackageEntry, mapSourceType } from '../research-package';

function entry(name: string, content: unknown) {
  const ext = name.toLowerCase().endsWith('.csv') ? '.csv' : '.json';
  return {
    path: name,
    name,
    ext,
    content: typeof content === 'string' ? content : JSON.stringify(content),
  };
}

describe('isResearchPackageEntry', () => {
  it('matches package filenames in any folder, case-insensitively', () => {
    expect(isResearchPackageEntry('substances.json')).toBe(true);
    expect(isResearchPackageEntry('pkg/Evidence.JSON')).toBe(true);
    expect(isResearchPackageEntry('source_ledger.csv')).toBe(true);
    expect(isResearchPackageEntry('my-datapack.json')).toBe(false);
  });
});

describe('mapSourceType', () => {
  it('maps free-text evidence types to v1 source types', () => {
    expect(mapSourceType('official product page or official collection')).toBe('brand_or_vendor_document');
    expect(mapSourceType('official government health page')).toBe('official_label_or_document');
    expect(mapSourceType('Third-party lab report')).toBe('coa_or_testing_document');
    expect(mapSourceType('systematic review')).toBe('review_or_meta_analysis');
    expect(mapSourceType('official product label')).toBe('official_label_or_document');
    expect(mapSourceType('something unknown')).toBe('other');
  });
});

describe('convertResearchPackage', () => {
  it('returns null pack when no package files are present', () => {
    const res = convertResearchPackage([entry('notes.json', { kind: 'stackatlas-data-pack' })]);
    expect(res.pack).toBeNull();
    expect(res.handled.size).toBe(0);
  });

  it('converts substances with derived slug and classification', () => {
    const res = convertResearchPackage([
      entry('substances.json', [
        {
          canonical_name: 'Ashwagandha',
          category: 'Botanical',
          parent_category: 'Herbs and botanicals',
          description: 'A botanical ingredient.',
          aliases: ['Withania somnifera'],
          research_areas: ['sleep'],
        },
        { canonical_name: 'Ostarine', category: 'SARM' },
      ]),
    ]);
    const subs = res.pack?.substances ?? [];
    expect(subs).toHaveLength(2);
    expect(subs[0]).toMatchObject({ slug: 'ashwagandha', name: 'Ashwagandha', classification: 'Everyday' });
    expect(subs[0].aliases).toContain('Withania somnifera');
    expect(subs[1]).toMatchObject({ slug: 'ostarine', classification: 'Frontier' });
    expect(res.handled.has('substances.json')).toBe(true);
  });

  it('merges products into their brand by slug across files', () => {
    const res = convertResearchPackage([
      entry('brands.json', [
        { brand_name: 'NOW Foods', official_website: 'https://nowfoods.com' },
      ]),
      entry('products.json', [
        {
          brand_name: 'NOW Foods',
          product_name: 'Ashwagandha 450 mg',
          linked_substances: ['Ashwagandha'],
          active_ingredients: [{ name: 'Ashwagandha', amount: '450 mg' }],
        },
        {
          brand_name: 'NOW Foods',
          product_name: 'L-Theanine 200 mg',
          linked_substances: ['L-Theanine'],
        },
      ]),
    ]);
    const brands = res.pack?.brands ?? [];
    expect(brands).toHaveLength(1);
    expect(brands[0].slug).toBe('now-foods');
    expect(brands[0].products).toHaveLength(2);
    expect(brands[0].products?.[0]).toMatchObject({ name: 'Ashwagandha 450 mg', substance_slug: 'ashwagandha' });
    expect(brands[0].products?.[0].ingredients?.[0]).toEqual({ name: 'Ashwagandha', amount: '450 mg' });
  });

  it('converts evidence and a source ledger into sources, skipping "multiple"', () => {
    const res = convertResearchPackage([
      entry('evidence.json', [
        {
          evidence_id: 'E1',
          evidence_type: 'official government health page',
          title: 'Ashwagandha: Usefulness and Safety',
          url: 'https://nccih.nih.gov/health/ashwagandha',
          publisher: 'NCCIH',
          document_date: '2024',
          applies_to: { substance: 'Ashwagandha' },
        },
      ]),
      entry(
        'source_ledger.csv',
        'Source ID,URL,Title,Publisher,Source type,Substance,Document date\n' +
          'S1,https://fda.gov/x,Dietary Supplements,FDA,official regulatory information,Ashwagandha | Berberine,2026\n' +
          'S2,https://ex.com/y,Broad Ref,Pub,official database,multiple,2025',
      ),
    ]);
    const sources = res.pack?.sources ?? [];
    expect(sources).toHaveLength(3);
    const nccih = sources.find((s) => s.journal_or_site === 'NCCIH');
    expect(nccih).toMatchObject({ source_type: 'official_label_or_document', year: 2024, substances: ['ashwagandha'] });
    const fda = sources.find((s) => s.journal_or_site === 'FDA');
    expect(fda?.substances).toEqual(['ashwagandha']); // first concrete substance
    const broad = sources.find((s) => s.title === 'Broad Ref');
    expect(broad?.substances).toBeUndefined(); // "multiple" is dropped, not linked
  });

  it('strips guardrail words from derived descriptions', () => {
    const res = convertResearchPackage([
      entry('substances.json', [
        { canonical_name: 'Creatine', category: 'Amino acid', description: 'A proven and effective compound.' },
      ]),
    ]);
    expect(res.pack?.substances?.[0].description).not.toMatch(/proven|effective/i);
  });
});
