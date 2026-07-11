/*
 * Exports the entire mock catalog (SUBSTANCES, BRANDS, STACKS from
 * src/data/mockData.ts) as a StackAtlas Data Pack v1 JSON document.
 *
 *   npx tsx scripts/export-mock-pack.ts [output-path]
 *
 * Prints the pack to stdout by default, or writes it to the given path.
 * Run counts/warnings are always printed to stderr so they don't pollute
 * stdout when piping.
 */

// mock data reads localStorage at import time; provide an in-memory shim so
// this runs under Node. Must be set before importing the data module (dynamic import).
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
} as Storage;

import { writeFileSync } from 'node:fs';
import {
  DATA_PACK_KIND,
  DATA_PACK_SCHEMA_VERSION,
  type BrandPackRow,
  type BrandProductPackRow,
  type DataPack,
  type StackPackRow,
  type SubstancePackRow,
} from '../src/services/import/types';

const { SUBSTANCES, BRANDS, STACKS } = await import('../src/data/mockData');

const substanceByName = new Map(SUBSTANCES.map((s) => [s.name.toLowerCase(), s.id]));

// possiblePairings on mock substances is a list of display names (some of
// which aren't in the catalog at all, e.g. "Zinc", "Beta-Alanine"). Match
// against known substance names and drop anything that doesn't resolve.
function resolvePairings(substanceId: string, names: string[]): string[] {
  const slugs: string[] = [];
  for (const name of names) {
    const slug = substanceByName.get(name.toLowerCase());
    if (slug) {
      slugs.push(slug);
    } else {
      console.warn(`[export-mock-pack] ${substanceId}: dropping unmatched pairing "${name}"`);
    }
  }
  return slugs;
}

const substances: SubstancePackRow[] = SUBSTANCES.map((s) => ({
  slug: s.id,
  name: s.name,
  classification: s.classification,
  description: s.description,
  formula: s.formula,
  reported_dose_range: s.averageDosage,
  length_of_cycle: s.lengthOfCycle,
  tolerance_buildup: s.toleranceBuildup,
  risk_level: s.riskLevel,
  routes: s.paths.map((p) => ({ domain: p.domain, category: p.category })),
  type_tags: s.typeTags,
  administration: s.administration,
  markers: s.markers ?? [],
  health_risks: s.healthRisks,
  subjective_effects: s.subjectiveEffects,
  pairings: resolvePairings(s.id, s.possiblePairings),
  most_popular_brand_slug: s.mostPopularBrandId,
}));

// Brand.products is a flat list of substance ids sold by the brand;
// Brand.productCatalog has the richer per-product detail (ingredients,
// health labels) for a subset of those. Use productCatalog where available
// and fall back to a minimal product row for ids only present in `products`.
function brandProducts(brand: (typeof BRANDS)[number]): BrandProductPackRow[] {
  const catalog = brand.productCatalog ?? [];
  const rows: BrandProductPackRow[] = catalog.map((p) => ({
    name: p.name,
    substance_slug: p.substanceId,
    ingredients: p.ingredients?.map((i) => ({ name: i.name, amount: i.amount })),
    health_labels: p.healthLabels,
  }));
  const covered = new Set(catalog.map((p) => p.substanceId).filter(Boolean));
  for (const substanceId of brand.products ?? []) {
    if (covered.has(substanceId)) continue;
    const name = SUBSTANCES.find((s) => s.id === substanceId)?.name ?? substanceId;
    rows.push({ name, substance_slug: substanceId });
  }
  return rows;
}

const brands: BrandPackRow[] = BRANDS.map((b) => ({
  slug: b.id,
  name: b.name,
  description: b.description,
  shipping_reliability: b.shippingReliability,
  contamination_reports: b.contaminationReports,
  products: brandProducts(b),
}));

const stacks: StackPackRow[] = STACKS.map((s) => ({
  name: s.name,
  description: s.description,
  components: s.substances.map((c) => c.id),
}));

const pack: DataPack = {
  kind: DATA_PACK_KIND,
  schema_version: DATA_PACK_SCHEMA_VERSION,
  generated_by: 'export-mock-pack script',
  generated_at: new Date().toISOString(),
  label: 'mock-catalog export',
  substances,
  brands,
  stacks,
};

const json = JSON.stringify(pack, null, 2);
const outPath = process.argv[2];
if (outPath) {
  writeFileSync(outPath, json + '\n');
  console.error(`Wrote pack to ${outPath}`);
} else {
  console.log(json);
}
console.error(
  `substances=${substances.length} brands=${brands.length} stacks=${stacks.length}`,
);
