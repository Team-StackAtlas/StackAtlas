import type { TypeTag } from '../data/mockData';

/**
 * Maps free-text taxonomy labels to the app's six canonical type tags.
 * Imported substances arrive with dataset categories like "Pharmaceutical
 * drug", "Vitamin", or "Amino acid" — none of which equal a TypeTag value, so
 * without this they match no type-filter chip on the Map and the catalog
 * looks like it has one Pharmaceutical. Rules are ordered most-specific
 * first so "Peptide drug" reads as Peptide before Pharmaceutical.
 */
const SPECIFIC_RULES: { tag: TypeTag; keywords: string[] }[] = [
  { tag: '🧬 Peptide', keywords: ['peptide'] },
  { tag: '🧪 Research Compound', keywords: ['research compound', 'research chemical', 'experimental compound', 'investigational'] },
  { tag: '🏥 Pharmaceutical', keywords: ['pharmaceutical', 'prescription', 'medication', 'drug'] },
  { tag: '🌿 Botanical', keywords: ['botanical', 'herb', 'plant extract', 'plant-derived', 'adaptogen', 'mushroom', 'fungal', 'root extract', 'leaf extract'] },
  { tag: '🍽️ Food / Drink', keywords: ['food', 'drink', 'beverage', 'culinary', 'tea', 'coffee'] },
];

// Supplement is the catch-all commercial bucket: it only applies when no
// specific rule matched, so "Research compound" doesn't also file under
// Supplement just because "compound" is a word.
const SUPPLEMENT_KEYWORDS = [
  'supplement', 'vitamin', 'mineral', 'amino acid', 'fatty acid', 'nutrient',
  'micronutrient', 'electrolyte', 'probiotic', 'prebiotic', 'antioxidant',
  'hormone', 'protein', 'extract', 'compound', 'microbial',
];

/** Canonical tags implied by one free-text label; empty when nothing matches. */
export function inferTypeTags(label: string | undefined | null): TypeTag[] {
  if (!label) return [];
  const haystack = label.toLowerCase();
  if (!haystack.trim()) return [];
  const matched: TypeTag[] = [];
  for (const rule of SPECIFIC_RULES) {
    if (rule.keywords.some((kw) => haystack.includes(kw))) matched.push(rule.tag);
  }
  if (matched.length === 0 && SUPPLEMENT_KEYWORDS.some((kw) => haystack.includes(kw))) {
    matched.push('💊 Supplement');
  }
  return matched;
}

/** The single best canonical tag for a label (first, most specific match). */
export function inferTypeTag(label: string | undefined | null): TypeTag | null {
  return inferTypeTags(label)[0] ?? null;
}
