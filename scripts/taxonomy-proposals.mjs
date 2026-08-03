// Taxonomy proposal engine (the tool behind migrations 20260803120000 /
// 20260803130000). Reads a full catalog dump and computes, for every
// substance: canonical goal-category routes (with their home domain), a
// rule-based risk_level for rows missing one, and any classification-sanity
// flags. It reuses the same category keywords the app applies at read time
// (src/lib/categoryInference.ts) plus a functional-tag extension, so what gets
// persisted matches what the UI already infers. Output is a reviewable
// proposals.json + summary stats — this script never touches the database.
//
// Corpus dump shape (one row per substance):
//   { slug, name, classification, risk_level, descr, tags: string[], route_count }
// produced from the live DB via the Supabase MCP (see the migration PRs).
//
// Usage: node scripts/taxonomy-proposals.mjs <corpus.json> <out.json>
import fs from 'node:fs';

const [corpusPath, outPath = 'proposals.json'] = process.argv.slice(2);
if (!corpusPath) {
  console.error('usage: node scripts/taxonomy-proposals.mjs <corpus.json> [out.json]');
  process.exit(1);
}
const subs = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));

// Canonical goal categories → { domain, keywords }. The domain is what fixes
// the read-time fallback that used to stamp everything 'Body'.
const CAT = {
  Cognition: { domain: 'Mind', kw: ['cognit', 'attention', 'memory', 'focus', 'neurolog', 'nerve growth', 'brain', 'nootropic', 'mental clarity', 'acetylcholine', 'racetam', 'choline', 'serotonin precursor', 'wakefulness', 'eugeroic', 'stimulant', 'aliphatic amine', 'carnitine', 'ampakine', 'dopaminergic', 'cholinerg', 'modafinil', 'methylphenidate', 'amphetamine'] },
  Recovery: { domain: 'Mind', kw: ['sleep', 'jet lag', 'circadian', 'fatigue', 'recovery', 'relaxation', 'insomnia', 'melatonin', 'serotonin', '5-htp', 'tryptophan', 'gaba', 'anxiolytic'] },
  Performance: { domain: 'Body', kw: ['exercise', 'performance', 'strength', 'power', 'muscle', 'sports nutrition', 'high-intensity', 'endurance', 'athletic', 'carnosine', 'ergogenic', 'creatine', 'anabolic', 'sarm', 'testosterone booster', 'carnitine ester', 'beta-alanine', 'nitric'] },
  Longevity: { domain: 'Vitality', kw: ['longevity', 'aging', 'ageing', 'mitochond', 'nad ', 'antioxidant', 'oxidative stress', 'senescence', 'telomere', 'rapamycin', 'sirtuin', 'coenzyme', 'cofactor', 'organosulfur', 'ubiquinone', 'polyphenol', 'resveratrol', 'fisetin', 'carotenoid'] },
  'Mood & Stress': { domain: 'Mind', kw: ['mood', 'stress', 'anxiety', 'psychiatric', 'depression', 'emotional', 'calm', 'adaptogen', 'anxiolytic', 'entactogen', 'serotonin'] },
  'Metabolic Health': { domain: 'Vitality', kw: ['metabol', 'glucose', 'glyc', 'insulin', 'lipid', 'triglycer', 'satiety', 'appetite', 'weight', 'fat loss', 'blood sugar', 'glp-1', 'semaglutide', 'thermogenic', 'lipolytic', 'diol', 'ketone', 'ketogenic'] },
  'Hormonal Health': { domain: 'Vitality', kw: ['thyroid', 'testosterone', 'estrogen', 'fertility', 'reproduction', 'hormone', 'endocrine', 'libido', 'androgen', 'pregnancy', 'peptide hormone'] },
  'Digestive Health': { domain: 'Vitality', kw: ['digest', 'gut', 'microbiome', 'bowel', 'gastrointestinal', 'diarrhea', 'bile', 'probiotic', 'prebiotic', 'fiber', 'enzyme', 'lactobacillus', 'bifidobacter', 'saccharomyces', 'oligosaccharide', 'fucosyllactose'] },
  'Heart Health': { domain: 'Vitality', kw: ['cardiovascular', 'blood pressure', 'cholesterol', 'circulation', 'blood flow', 'nitric oxide', 'vascular', 'coagulation', 'heart', 'hypertension', 'anemia', 'hematolog', 'iron status'] },
  'Pain & Injury': { domain: 'Body', kw: ['wound healing', 'injury', 'pain', 'migraine', 'inflammation', 'anti-inflammatory', 'soreness', 'analgesic'] },
  'Joint & Mobility': { domain: 'Body', kw: ['joint', 'collagen', 'connective tissue', 'bone', 'cartilage', 'tendon', 'ligament', 'mobility', 'osteoporosis', 'osteo'] },
  'Beauty & Skin': { domain: 'Body', kw: ['skin', 'hair', 'nail', 'epithelial', 'acne', 'dermatolog', 'complexion', 'cosmetic', 'sunscreen', 'topical', 'melanocortin', 'tanning', 'carotene'] },
};

// Rule-based risk for rows missing one. Most-severe class of tag wins.
function inferRisk(s) {
  const tags = (s.tags || []).map((t) => t.toLowerCase()).join(' ');
  const cls = s.classification;
  if (/anabolic steroid|sarm|nonsteroidal androgen|androgen|steroid hormone|peptide hormone|prohormone/.test(tags)) return 'High';
  if (/stimulant|sleep drug|metabolic drug|topical drug|peptide drug|cannabinoid|nonsteroidal/.test(tags)) return 'Moderate';
  if (cls === 'Frontier') return 'Moderate';
  if (/nutrient|vitamin|mineral|amino acid|botanical|probiotic|enzyme|lipid|fiber/.test(tags)) return 'Low';
  if (cls === 'Everyday') return 'Low';
  if (cls === 'Clinical') return 'Moderate';
  return null;
}

// Classification sanity flags (surfaced for review, never auto-applied — the
// phase-1 candidates were all false positives).
function classFlag(s) {
  const tags = (s.tags || []).map((t) => t.toLowerCase()).join(' ');
  if (s.classification === 'Everyday' && /anabolic steroid|sarm|nonsteroidal androgen|androgen|steroid hormone|peptide drug|peptide hormone|prohormone/.test(tags)) return 'Frontier';
  if (s.classification === 'Everyday' && /prescription|clinical|drug\b/.test(tags)) return 'Clinical';
  return null;
}

let routeProp = 0, riskProp = 0, classProp = 0;
const noSignal = [];
const proposals = [];
for (const s of subs) {
  const hay = [...(s.tags || []), s.descr, s.name].filter(Boolean).join('  ').toLowerCase();
  const cats = Object.entries(CAT)
    .filter(([, c]) => c.kw.some((k) => hay.includes(k)))
    .map(([n, c]) => ({ category: n, domain: c.domain }))
    .slice(0, 4);
  const risk = s.risk_level ? null : inferRisk(s);
  const newClass = classFlag(s);
  const needsRoute = s.route_count === 0 && cats.length > 0;
  if (needsRoute) routeProp++;
  if (risk) riskProp++;
  if (newClass) classProp++;
  if (s.route_count === 0 && cats.length === 0) noSignal.push(s.slug);
  if (needsRoute || risk || newClass) {
    proposals.push({ slug: s.slug, name: s.name, cls: s.classification, newClass, risk, cats: cats.map((c) => `${c.domain}/${c.category}`) });
  }
}

fs.writeFileSync(outPath, JSON.stringify(proposals, null, 1));
console.log('total substances:', subs.length);
console.log('route proposals:', routeProp, '| risk proposals:', riskProp, '| classification flags:', classProp);
console.log('no-signal (needs phase-2 lexicon):', noSignal.length);
