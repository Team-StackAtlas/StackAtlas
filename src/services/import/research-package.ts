// Converts an "advanced research package" — the multi-file export produced by
// the deep-research agent (substances.json, brands.json, products.json,
// evidence.json, source_ledger.csv) — into the internal DataPack shape so it
// can be dropped straight into Admin → Research "Upload research files".
//
// This schema is distinct from a hand-authored DataPack: it uses canonical_name
// / brand_name / evidence_id fields and splits products and sources into their
// own files. We map what the current DB supports (substances, brands + their
// products, sources) and merge products into the matching brand by slug so a
// brand is upserted once, with its products, regardless of file order. Batches,
// evidence scope beyond substance, and raw claims are not modelled yet and are
// dropped with a warning rather than silently.

import {
  DATA_PACK_KIND,
  DATA_PACK_SCHEMA_VERSION,
  type Classification,
  type DataPack,
  type BrandPackRow,
  type BrandProductPackRow,
  type ResearchSourceType,
  type RowIssue,
  type SourcePackRow,
  type SubstancePackRow,
} from './types';
import { slugify } from './validate';
import { parseCsvRows } from './parse-csv';

const GUARDRAIL_WORDS = /\b(recommended|proven|best|safe|effective)\b/gi;
const strip = (t: string): string => t.replace(GUARDRAIL_WORDS, '').replace(/\s{2,}/g, ' ').trim();

/** Filenames (case-insensitive, any folder) that make up a research package. */
const PACKAGE_BASENAMES = new Set([
  'substances.json',
  'brands.json',
  'products.json',
  'evidence.json',
  'source_ledger.csv',
]);

export function isResearchPackageEntry(name: string): boolean {
  return PACKAGE_BASENAMES.has(name.toLowerCase().split('/').pop() ?? '');
}

function baseName(name: string): string {
  return name.toLowerCase().split('/').pop() ?? '';
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map(asString).filter(Boolean) : [];
}

// --- classification + source-type mapping ---------------------------------

function classifySubstance(category: string, parent: string): Classification {
  const c = `${category} ${parent}`.toLowerCase();
  if (/\b(sarm|peptide|prohormone|research chemical|nootropic drug|investigational)\b/.test(c)) {
    return 'Frontier';
  }
  if (/\b(hormone|steroid|androgen|prescription|drug|secretagogue)\b/.test(c)) return 'Clinical';
  if (/\b(vitamin|mineral|botanical|herb|amino|protein|probiotic|fatty acid|electrolyte|food|fiber|nutrient)\b/.test(c)) {
    return 'Everyday';
  }
  return 'Unknown';
}

/** Map a free-text evidence/source type to one of the 10 v1 source types. */
export function mapSourceType(raw: string): ResearchSourceType {
  const t = raw.toLowerCase();
  if (/coa|certificate of analysis|third[- ]party (lab|test)|test report|lab report/.test(t)) {
    return 'coa_or_testing_document';
  }
  if (/product page|brand website|brand collection|vendor|catalog|store/.test(t)) {
    return 'brand_or_vendor_document';
  }
  if (/label|product data|product information|spec sheet|monograph/.test(t)) {
    return 'official_label_or_document';
  }
  if (/meta[- ]analysis|systematic review|\breview\b/.test(t)) return 'review_or_meta_analysis';
  if (/animal|rodent|murine|in vivo/.test(t)) return 'animal_study';
  if (/in vitro|mechanistic|cell culture/.test(t)) return 'in_vitro_or_mechanistic';
  if (/clinical trial|\brct\b|human (study|trial)|cohort|randomi/.test(t)) return 'human_study';
  if (/practitioner|clinician|physician|pharmacist/.test(t)) return 'practitioner_source';
  if (/influencer|forum|reddit|community|social media|blog/.test(t)) return 'community_or_influencer_mention';
  // Government/regulatory/database/fact-sheet pages are official documents.
  if (/government|regulatory|fda|nih|nccih|database|taxonomy|fact sheet|official|health page|monograph|portal/.test(t)) {
    return 'official_label_or_document';
  }
  return 'other';
}

function yearFrom(date: string): number | undefined {
  const m = date.match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0]) : undefined;
}

// --- per-file converters ---------------------------------------------------

function convertSubstances(rows: unknown[], issues: RowIssue[]): SubstancePackRow[] {
  const out: SubstancePackRow[] = [];
  const seen = new Set<string>();
  rows.forEach((r, i) => {
    if (typeof r !== 'object' || r === null) return;
    const row = r as Record<string, unknown>;
    const name = asString(row.canonical_name) || asString(row.name);
    const slug = slugify(name);
    if (!name || !slug) {
      issues.push({ path: `substances[${i}]`, message: `substance ${i}: missing canonical_name, skipped`, severity: 'warning' });
      return;
    }
    if (seen.has(slug)) return;
    seen.add(slug);
    const category = asString(row.category);
    const parent = asString(row.parent_category);
    const pack: SubstancePackRow = {
      slug,
      name,
      classification: classifySubstance(category, parent),
      description: strip(asString(row.description)) || `${name} — research entry.`,
    };
    const aliases = asStringArray(row.aliases);
    if (aliases.length) pack.aliases = aliases;
    const origin = asString(row.origin);
    if (origin) pack.origin = strip(origin);
    const tags = [...new Set([category, parent, ...asStringArray(row.research_areas)].filter(Boolean))];
    if (tags.length) pack.type_tags = tags;
    const formats = asStringArray(row.common_product_formats).concat(asStringArray(row.commercial_forms));
    if (formats.length) pack.administration = [...new Set(formats)];
    out.push(pack);
  });
  return out;
}

function convertBrands(rows: unknown[], issues: RowIssue[], brandMap: Map<string, BrandPackRow>, sources: SourcePackRow[]): void {
  rows.forEach((r, i) => {
    if (typeof r !== 'object' || r === null) return;
    const row = r as Record<string, unknown>;
    const name = asString(row.brand_name) || asString(row.name);
    const slug = slugify(name);
    if (!name || !slug) {
      issues.push({ path: `brands[${i}]`, message: `brand ${i}: missing brand_name, skipped`, severity: 'warning' });
      return;
    }
    const existing = brandMap.get(slug);
    const brand: BrandPackRow = existing ?? { slug, name, products: [] };
    const website = asString(row.official_website);
    const manufacturer = asString(row.manufacturer_name);
    if (!brand.description) {
      brand.description = strip([manufacturer && `Manufacturer: ${manufacturer}`, website].filter(Boolean).join(' — ')) || undefined;
    }
    const docUrl = website || asString((row.testing_pages as string[])?.[0]);
    if (docUrl) brand.transparency = { ...(brand.transparency ?? {}), documentation_url: docUrl };
    brandMap.set(slug, brand);

    // Brand-level sources become source rows linked to their brand.
    if (Array.isArray(row.sources)) {
      row.sources.forEach((s) => {
        if (typeof s !== 'object' || s === null) return;
        const src = s as Record<string, unknown>;
        const title = asString(src.title);
        if (!title) return;
        const source: SourcePackRow = {
          title,
          source_type: mapSourceType(asString(src.source_type)),
          brands: [slug],
        };
        const url = asString(src.url);
        if (url) source.url = url;
        const y = yearFrom(asString(src.document_date) || asString(src.retrieved_at));
        if (y) source.year = y;
        const pub = asString(src.publisher);
        if (pub) source.journal_or_site = pub;
        sources.push(source);
      });
    }
  });
}

function convertProducts(rows: unknown[], issues: RowIssue[], brandMap: Map<string, BrandPackRow>): void {
  rows.forEach((r, i) => {
    if (typeof r !== 'object' || r === null) return;
    const row = r as Record<string, unknown>;
    const brandName = asString(row.brand_name);
    const brandSlug = slugify(brandName);
    const productName = asString(row.product_name);
    if (!brandSlug || !productName) {
      issues.push({ path: `products[${i}]`, message: `product ${i}: missing brand_name or product_name, skipped`, severity: 'warning' });
      return;
    }
    const brand = brandMap.get(brandSlug) ?? { slug: brandSlug, name: brandName || brandSlug, products: [] };
    const linked = asStringArray(row.linked_substances);
    const product: BrandProductPackRow = { name: productName };
    if (linked.length) product.substance_slug = slugify(linked[0]);
    if (Array.isArray(row.active_ingredients)) {
      const ingredients = row.active_ingredients
        .map((ing) => {
          if (typeof ing !== 'object' || ing === null) return null;
          const o = ing as Record<string, unknown>;
          const n = asString(o.name);
          if (!n) return null;
          const amount = asString(o.amount);
          return amount ? { name: n, amount } : { name: n };
        })
        .filter((x): x is { name: string; amount?: string } => x !== null);
      if (ingredients.length) product.ingredients = ingredients;
    }
    brand.products = [...(brand.products ?? []), product];
    brandMap.set(brandSlug, brand);
  });
}

function convertEvidence(rows: unknown[], sources: SourcePackRow[]): void {
  rows.forEach((r) => {
    if (typeof r !== 'object' || r === null) return;
    const row = r as Record<string, unknown>;
    const title = asString(row.title);
    if (!title) return;
    const source: SourcePackRow = {
      title,
      source_type: mapSourceType(asString(row.evidence_type)),
    };
    const url = asString(row.url) || asString(row.pdf_url);
    if (url) source.url = url;
    const y = yearFrom(asString(row.document_date) || asString(row.retrieved_at));
    if (y) source.year = y;
    const pub = asString(row.publisher);
    if (pub) source.journal_or_site = pub;
    const appliesTo = row.applies_to as Record<string, unknown> | undefined;
    const substance = asString(appliesTo?.substance);
    if (substance && substance.toLowerCase() !== 'multiple') source.substances = [slugify(substance)];
    const brand = asString(appliesTo?.brand);
    if (brand && brand.toLowerCase() !== 'multiple') source.brands = [slugify(brand)];
    const stack = asString(appliesTo?.stack);
    if (stack && stack.toLowerCase() !== 'multiple') source.stacks = [stack];
    sources.push(source);
  });
}

const LEDGER_HEADERS: Record<string, string> = {
  'source id': 'id', title: 'title', url: 'url', publisher: 'publisher',
  'source type': 'type', substance: 'substance', 'document date': 'date', 'retrieval date': 'retrieved',
};

function convertSourceLedger(text: string, sources: SourcePackRow[]): void {
  const rows = parseCsvRows(text);
  if (rows.length < 2) return;
  const header = rows[0].map((h) => LEDGER_HEADERS[h.trim().toLowerCase()] ?? '');
  const idx = (k: string) => header.indexOf(k);
  const seen = new Set<string>();
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const title = (row[idx('title')] ?? '').trim();
    const url = (row[idx('url')] ?? '').trim();
    if (!title) continue;
    const key = url || title;
    if (seen.has(key)) continue;
    seen.add(key);
    const source: SourcePackRow = { title, source_type: mapSourceType((row[idx('type')] ?? '').trim()) };
    if (url) source.url = url;
    const pub = (row[idx('publisher')] ?? '').trim();
    if (pub) source.journal_or_site = pub;
    const y = yearFrom((row[idx('date')] ?? '').trim() || (row[idx('retrieved')] ?? '').trim());
    if (y) source.year = y;
    const substanceCell = (row[idx('substance')] ?? '').trim();
    // A ledger row may list many substances with " | "; link the first concrete one.
    const first = substanceCell.split('|').map((s) => s.trim()).filter((s) => s && s.toLowerCase() !== 'multiple')[0];
    if (first) source.substances = [slugify(first)];
    sources.push(source);
  }
}

// --- entry point -----------------------------------------------------------

export interface ResearchPackageResult {
  pack: DataPack | null;
  issues: RowIssue[];
  handled: Set<string>; // relative paths consumed, so the caller skips them
}

/**
 * Detect and convert research-package files among a set of ZIP/multi-file
 * entries. Returns a merged DataPack plus the set of entry paths consumed;
 * entries not part of a research package are left untouched for the normal
 * per-file parser. Returns pack:null when no package files are present.
 */
export function convertResearchPackage(
  entries: { path: string; name: string; ext: string; content: string }[],
): ResearchPackageResult {
  const pkg = entries.filter((e) => isResearchPackageEntry(e.name));
  if (pkg.length === 0) return { pack: null, issues: [], handled: new Set() };

  const issues: RowIssue[] = [];
  const handled = new Set<string>();
  const substances: SubstancePackRow[] = [];
  const brandMap = new Map<string, BrandPackRow>();
  const sources: SourcePackRow[] = [];

  // Only bare arrays are research-package files. Anything else (a hand-authored
  // DataPack object, malformed JSON) is left unhandled so the normal per-file
  // parser picks it up and reports it — no false error here.
  const readJson = (content: string): unknown[] | null => {
    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  // Substances and brands first, then products (merge into brands), then sources.
  for (const e of pkg) {
    const bn = baseName(e.name);
    if (bn === 'substances.json') {
      const rows = readJson(e.content);
      if (rows) { substances.push(...convertSubstances(rows, issues)); handled.add(e.path); }
    } else if (bn === 'brands.json') {
      const rows = readJson(e.content);
      if (rows) { convertBrands(rows, issues, brandMap, sources); handled.add(e.path); }
    }
  }
  for (const e of pkg) {
    if (baseName(e.name) === 'products.json') {
      const rows = readJson(e.content);
      if (rows) { convertProducts(rows, issues, brandMap); handled.add(e.path); }
    }
  }
  for (const e of pkg) {
    const bn = baseName(e.name);
    if (bn === 'evidence.json') {
      const rows = readJson(e.content);
      if (rows) { convertEvidence(rows, sources); handled.add(e.path); }
    } else if (bn === 'source_ledger.csv') {
      convertSourceLedger(e.content, sources);
      handled.add(e.path);
    }
  }

  const pack: DataPack = {
    kind: DATA_PACK_KIND,
    schema_version: DATA_PACK_SCHEMA_VERSION,
    generated_by: 'research-package',
  };
  if (substances.length) pack.substances = substances;
  if (brandMap.size) pack.brands = [...brandMap.values()];
  if (sources.length) pack.sources = sources;

  return { pack, issues, handled };
}
