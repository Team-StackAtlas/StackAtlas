import { describe, it, expect } from 'vitest';
import { isSubstanceCatalogCsv, parseCsv, parseSubstanceCatalogCsv } from '../parse';

const HEADER =
  'catalog_id,canonical_name,aliases,category,subcategory,origin_type,use_context_tags,us_availability_legal_flag,priority,sources';

function row(cells: string[]): string {
  return cells.map((c) => `"${c.replace(/"/g, '""')}"`).join(',');
}

describe('isSubstanceCatalogCsv', () => {
  it('detects the catalog shape by canonical_name', () => {
    expect(isSubstanceCatalogCsv(HEADER.split(','))).toBe(true);
    expect(isSubstanceCatalogCsv(['catalog_id', 'category', 'notes'])).toBe(true);
  });

  it('does not misfire on a sources CSV', () => {
    expect(isSubstanceCatalogCsv(['title', 'source_type', 'url', 'pmid'])).toBe(false);
  });
});

describe('parseSubstanceCatalogCsv', () => {
  it('maps rows to substances with classification precedence', () => {
    const csv = [
      HEADER,
      row(['SA-1', 'Retinol', 'Vitamin A1; preformed vitamin A', 'Nutrient', 'Vitamin A vitamer', 'Animal-derived', 'vision', 'FOOD; SUPPLEMENT-MARKETED', 'P1', 'S01']),
      row(['SA-2', 'Semaglutide', 'Ozempic; Wegovy', 'Peptide drug', 'GLP-1 agonist', 'Synthetic', 'metabolic', 'RX-DRUG', 'P1', 'S07']),
      row(['SA-3', 'Ligandrol', 'LGD-4033', 'SARM', 'AR modulator', 'Synthetic', 'performance', 'FDA-UNAPPROVED; RESEARCH-ONLY/GRAY', 'P1', 'S11']),
      row(['SA-4', 'Mystery Compound', '', 'Other', '', '', '', '', 'P3', '']),
    ].join('\n');

    const { pack, issues } = parseSubstanceCatalogCsv(csv);
    expect(issues.filter((i) => i.severity === 'error')).toHaveLength(0);
    const subs = pack?.substances ?? [];
    expect(subs).toHaveLength(4);

    const bySlug = Object.fromEntries(subs.map((s) => [s.slug, s]));
    expect(bySlug['retinol'].classification).toBe('Everyday');
    expect(bySlug['semaglutide'].classification).toBe('Clinical');
    expect(bySlug['ligandrol'].classification).toBe('Frontier');
    expect(bySlug['mystery-compound'].classification).toBe('Unknown');

    // aliases and type_tags split
    expect(bySlug['retinol'].aliases).toEqual(['Vitamin A1', 'preformed vitamin A']);
    expect(bySlug['retinol'].type_tags).toEqual(['Nutrient', 'Vitamin A vitamer']);
    // description built from metadata
    expect(bySlug['retinol'].description).toContain('Vitamin A vitamer');
    expect(bySlug['retinol'].description).toContain('Catalog domain: Nutrient.');
  });

  it('strips language-guardrail words from generated descriptions', () => {
    const csv = [
      HEADER,
      row(['SA-9', 'GuardTest', '', 'Nutrient', 'a proven effective form', 'safe origin', '', 'FOOD', 'P1', '']),
    ].join('\n');
    const { pack } = parseSubstanceCatalogCsv(csv);
    const desc = pack?.substances?.[0].description ?? '';
    expect(desc).not.toMatch(/\b(recommended|proven|best|safe|effective)\b/i);
  });

  it('dedupes repeated canonical names within the file (first wins)', () => {
    const csv = [
      HEADER,
      row(['SA-1', 'Creatine', 'first', 'Amino-acid derivative', 'metabolite', '', '', 'FOOD', 'P1', '']),
      row(['SA-2', 'Creatine', 'second', 'Amino-acid derivative', 'metabolite', '', '', 'FOOD', 'P1', '']),
    ].join('\n');
    const { pack } = parseSubstanceCatalogCsv(csv);
    expect(pack?.substances).toHaveLength(1);
    expect(pack?.substances?.[0].aliases).toEqual(['first']);
  });

  it('routes a catalog CSV through parseCsv, a sources CSV to the sources parser', () => {
    const catalog = [HEADER, row(['SA-1', 'Zinc', '', 'Nutrient', 'mineral', '', '', 'FOOD', 'P1', ''])].join('\n');
    const catalogResult = parseCsv(catalog);
    expect(catalogResult.pack?.substances?.length).toBe(1);
    expect(catalogResult.pack?.sources ?? []).toHaveLength(0);

    const sources = 'title,source_type,url\n"A study","human_study","https://example.org/x"';
    const sourcesResult = parseCsv(sources);
    expect(sourcesResult.pack?.sources?.length).toBe(1);
    expect(sourcesResult.pack?.substances ?? []).toHaveLength(0);
  });
});
