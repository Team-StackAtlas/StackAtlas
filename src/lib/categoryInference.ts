import { BEARING_CATEGORIES } from './bearings';

/**
 * Maps free-text research signals (research areas, taxonomic category, name,
 * description) to the app's twelve canonical goal categories. Imported
 * substances arrive with taxonomic categories ("Vitamin", "Mineral") and
 * research areas ("bone health", "cognition") but no route paths, so without
 * this they'd belong to no big category card. Each canonical category owns a
 * set of lowercase substrings; a signal matches a category if any substring
 * appears in it.
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Cognition: ['cognit', 'attention', 'memory', 'focus', 'neurolog', 'nerve-growth', 'nerve growth', 'brain', 'nootropic', 'mental clarity', 'acetylcholine'],
  Recovery: ['sleep', 'jet lag', 'circadian', 'fatigue', 'recovery', 'relaxation', 'insomnia'],
  Performance: ['exercise', 'performance', 'strength', 'power', 'muscle', 'sports nutrition', 'high-intensity', 'endurance', 'athletic', 'carnosine', 'ergogenic'],
  Longevity: ['longevity', 'aging', 'ageing', 'mitochond', 'nad metabolism', 'antioxidant', 'oxidative stress', 'senescence', 'telomere'],
  'Mood & Stress': ['mood', 'stress', 'anxiety', 'psychiatric', 'depression', 'emotional', 'calm'],
  'Metabolic Health': ['metabol', 'glucose', 'glyc', 'insulin', 'lipid', 'triglycer', 'satiety', 'appetite', 'weight', 'fat loss', 'blood sugar', 'energy metabolism'],
  'Hormonal Health': ['thyroid', 'testosterone', 'estrogen', 'fertility', 'reproduction', 'hormone', 'endocrine', 'libido', 'androgen', 'pregnancy'],
  'Digestive Health': ['digest', 'gut', 'microbiome', 'bowel', 'gastrointestinal', 'diarrhea', 'bile', 'probiotic', 'prebiotic', 'fiber'],
  'Heart Health': ['cardiovascular', 'blood pressure', 'cholesterol', 'circulation', 'blood flow', 'nitric oxide', 'vascular', 'coagulation', 'heart', 'hypertension', 'anemia', 'hematolog', 'iron status'],
  'Pain & Injury': ['wound healing', 'injury', 'pain', 'migraine', 'inflammation', 'anti-inflammatory', 'soreness'],
  'Joint & Mobility': ['joint', 'collagen', 'connective tissue', 'bone', 'cartilage', 'tendon', 'ligament', 'mobility', 'osteoporosis', 'osteo'],
  'Beauty & Skin': ['skin', 'hair', 'nail', 'epithelial', 'acne', 'dermatolog', 'complexion'],
};

// Guard against typos: only categories that actually exist in BEARING_CATEGORIES.
const CANONICAL_NAMES = new Set(BEARING_CATEGORIES.map((c) => c.name));

/**
 * Returns the canonical category names implied by the given free-text signals,
 * in canonical (BEARING_CATEGORIES) order. Never returns more than `limit`
 * (default 4) so a broad substance doesn't blanket every card.
 */
export function inferCanonicalCategories(signals: (string | undefined | null)[], limit = 4): string[] {
  const haystack = signals.filter(Boolean).join('  ').toLowerCase();
  if (!haystack.trim()) return [];
  const matched = BEARING_CATEGORIES.map((c) => c.name).filter(
    (name) => CANONICAL_NAMES.has(name) && (CATEGORY_KEYWORDS[name] ?? []).some((kw) => haystack.includes(kw)),
  );
  return matched.slice(0, limit);
}
