import type { Brand, Substance } from '../data/mockData';
import { ACCENT_CYCLE, type Accent } from '../components/ui/accents';
import { BEARING_CATEGORIES, getCanonicalCategories } from './bearings';
import { displayName } from './substanceName';

/**
 * Deterministic visual identity for catalog entries, so thousands of cards
 * look designed without a single sourced image. Every substance gets:
 *   - a `kind`, which picks one of a handful of SVG templates
 *   - a short `label` ("K2", "Mg", "NAC", "BPC-157", or initials)
 *   - an `accent`, taken from its first goal category so a substance wears
 *     the same color as the category it lives in, with a slug-hash fallback
 *   - a `seed`, so the geometric templates vary per substance
 * Nothing here implies a physical appearance: a capsule outline means
 * "vitamin", not "this product is a capsule".
 */

export type VisualKind = 'vitamin' | 'mineral' | 'botanical' | 'fungal' | 'amino' | 'peptide' | 'pharma' | 'compound' | 'food' | 'supplement';

export interface VisualIdentity {
  kind: VisualKind;
  label: string;
  /** Secondary line for the detail-sized tile, e.g. the salt form of a mineral. */
  sublabel?: string;
  accent: Accent;
  seed: number;
}

const ELEMENTS: [string, string][] = [
  ['magnesium', 'Mg'], ['zinc', 'Zn'], ['iron', 'Fe'], ['calcium', 'Ca'], ['potassium', 'K'], ['sodium', 'Na'],
  ['selenium', 'Se'], ['copper', 'Cu'], ['chromium', 'Cr'], ['manganese', 'Mn'], ['iodine', 'I'], ['boron', 'B'],
  ['molybdenum', 'Mo'], ['lithium', 'Li'], ['phosphorus', 'P'], ['silicon', 'Si'], ['vanadium', 'V'], ['strontium', 'Sr'],
  ['sulfur', 'S'], ['nickel', 'Ni'], ['cobalt', 'Co'], ['fluoride', 'F'],
];

const FUNGAL = /\b(mushroom|lion'?s mane|reishi|cordyceps|chaga|turkey tail|shiitake|maitake|tremella|agarikon|mycelium|psilocyb)/i;
const FOOD = /\b(tea|coffee|cocoa|cacao|honey|broth|juice|vinegar|oil\b|yogurt|kefir|seed|berry|berries)\b/i;

export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function vitaminLabel(name: string, aliases: string[] = []): string | null {
  for (const candidate of [name, ...aliases]) {
    const m = candidate.match(/\bvitamin\s*([a-k])\s?-?(\d{0,2})\b/i);
    if (m) return `${m[1].toUpperCase()}${m[2]}`;
  }
  return null;
}

function elementFor(name: string): { symbol: string; form?: string } | null {
  const lower = name.toLowerCase();
  for (const [element, symbol] of ELEMENTS) {
    if (lower === element || lower.startsWith(`${element} `) || lower.startsWith(`${element}-`)) {
      const form = name.slice(element.length).replace(/^[\s-]+/, '').trim();
      return { symbol, form: form || undefined };
    }
  }
  return null;
}

function initials(name: string): string {
  const words = name.replace(/\(.*?\)/g, '').split(/[\s-]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).replace(/^./, (c) => c.toUpperCase());
}

export function accentForCategories(categories: string[], fallbackSeed: string): Accent {
  const canonical = getCanonicalCategories(categories);
  for (const c of canonical) {
    const idx = BEARING_CATEGORIES.findIndex((b) => b.name === c);
    if (idx >= 0) return ACCENT_CYCLE[idx % ACCENT_CYCLE.length];
  }
  return ACCENT_CYCLE[hashString(fallbackSeed) % ACCENT_CYCLE.length];
}

export function substanceIdentity(s: Pick<Substance, 'id' | 'name' | 'aliases' | 'typeTags' | 'paths'>): VisualIdentity {
  const seed = hashString(s.id || s.name);
  const accent = accentForCategories(s.paths.map((p) => p.category), s.id || s.name);
  const { acronym } = displayName(s);
  const tags = s.typeTags;

  const vit = vitaminLabel(s.name, s.aliases);
  if (vit) return { kind: 'vitamin', label: vit, accent, seed };

  const el = elementFor(s.name);
  if (el && !tags.includes('🏥 Pharmaceutical')) return { kind: 'mineral', label: el.symbol, sublabel: el.form, accent, seed };

  const label = acronym ?? initials(s.name);
  if (tags.includes('🧬 Peptide')) return { kind: 'peptide', label, accent, seed };
  if (tags.includes('🧪 Research Compound')) return { kind: 'compound', label, accent, seed };
  if (tags.includes('🏥 Pharmaceutical')) return { kind: 'pharma', label, accent, seed };
  if (FUNGAL.test(s.name)) return { kind: 'fungal', label, accent, seed };
  if (tags.includes('🌿 Botanical')) return { kind: 'botanical', label, accent, seed };
  if (tags.includes('🍽️ Food / Drink') || FOOD.test(s.name)) return { kind: 'food', label, accent, seed };
  if (/^[LD]-/i.test(s.name) || /\b(ine|ate)$/i.test(s.name.split(' ')[0]) && tags.includes('💊 Supplement') && /^[LD]-|glycine|taurine|creatine|carnitine|citrulline|arginine|glutamine|theanine|tyrosine|leucine/i.test(s.name)) {
    return { kind: 'amino', label, accent, seed };
  }
  return { kind: 'supplement', label, accent, seed };
}

export function brandIdentity(b: Pick<Brand, 'id' | 'name'>): { label: string; accent: Accent; seed: number } {
  const seed = hashString(b.id || b.name);
  return { label: initials(b.name), accent: ACCENT_CYCLE[seed % ACCENT_CYCLE.length], seed };
}
