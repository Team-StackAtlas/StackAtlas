/*
 * Operator dry-run: builds an ImportDataset from the current mock data and runs
 * the full validation rule set, printing counts + issues.
 *
 *   npm run seed:validate
 *
 * This is the first operator-status tool (data counts, validation errors,
 * import dry-run) ahead of any real persistence.
 */

// mock data reads localStorage at import time; provide an in-memory shim so this
// runs under Node. Must be set before importing the data module (dynamic import).
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
} as Storage;

const { SUPPLEMENTS, BRANDS, STACKS } = await import('../src/data/mockData');
const { validateDataset } = await import('../src/services/seed/import');
type ImportDataset = import('../src/services/seed/import').ImportDataset;

const dataset: ImportDataset = {
  substances: SUPPLEMENTS.map((s) => ({
    slug: s.id,
    name: s.name,
    classification: s.classification,
    description: s.description,
    categoryRoutes: s.paths.map((p) => `${p.domain}:${p.category}`),
    typeTags: s.typeTags,
    administrationMethods: s.administration,
    markers: s.markers,
    averageDosage: s.averageDosage,
    lengthOfCycle: s.lengthOfCycle,
    toleranceBuildup: s.toleranceBuildup,
    riskLevel: s.riskLevel,
    formula: s.formula,
  })),
  brands: BRANDS.map((b) => ({
    slug: b.id,
    name: b.name,
    description: b.description,
    shippingReliability: b.shippingReliability,
    contaminationReports: b.contaminationReports,
    products: (b.products ?? []).map((productId) => ({
      name: SUPPLEMENTS.find((s) => s.id === productId)?.name ?? productId,
      substanceSlug: productId,
    })),
  })),
  stacks: STACKS.map((s) => ({
    name: s.name,
    description: s.description,
    componentSlugs: s.substances.map((c) => c.id),
  })),
  sources: [],
};

const report = validateDataset(dataset);

console.log('StackAtlas seed validation\n');
console.log('Counts:');
for (const [key, value] of Object.entries(report.counts)) {
  console.log(`  ${key.padEnd(12)} ${value}`);
}

if (report.issues.length === 0) {
  console.log('\n✔ No validation issues.');
  process.exit(0);
}

console.log(`\n✖ ${report.issues.length} validation issue(s):`);
for (const issue of report.issues) {
  console.log(`  [${issue.code}] ${issue.path ?? ''} — ${issue.message}`);
}
process.exit(1);
