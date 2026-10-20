// Relevance ranking for "compare X with…" suggestions, shared by the
// CompareModal (entity pages) and the Compare page picker so both surfaces
// suggest the same sensible partners: things that do the same job first.
import type { Substance, Brand, Stack } from '../data/mockData';

export type CompareType = 'substance' | 'brand' | 'stack';
export type CompareItem = Substance | Brand | Stack;

export function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function tokenSet(values: string[]) {
  return new Set(values.flatMap((value) => normalizeText(value).split(' ').filter(Boolean)));
}

function overlapScore(a: string[], b: string[], weight: number) {
  const aTokens = tokenSet(a);
  const bTokens = tokenSet(b);
  let score = 0;
  aTokens.forEach((token) => {
    if (bTokens.has(token)) score += weight;
  });
  return score;
}

/** Count of values present in both lists, compared as whole normalized phrases. */
function phraseOverlap(a: string[], b: string[]) {
  const bSet = new Set(b.map(normalizeText));
  return a.map(normalizeText).filter((value) => bSet.has(value)).length;
}

// Verbs and filler that appear in effect prose across wholly unrelated
// substances. Left in, raw token overlap made Ashwagandha the top suggestion
// for Modafinil because both "reduced" and "improved" things.
const GENERIC_TOKENS = new Set([
  'improved', 'improves', 'improve', 'improvement', 'increased', 'increases', 'increase',
  'reduced', 'reduces', 'reduce', 'reduction', 'decreased', 'decreases', 'decrease',
  'enhanced', 'enhances', 'enhance', 'supports', 'support', 'supported', 'boosted',
  'boosts', 'boost', 'better', 'greater', 'higher', 'lower', 'mild', 'mildly',
  'overall', 'general', 'levels', 'level', 'sense', 'feeling', 'feelings', 'more',
  'less', 'during', 'from', 'with', 'without', 'and', 'the', 'for', 'may', 'can',
]);

function meaningfulTokens(values: string[]) {
  const out = new Set<string>();
  for (const value of values) {
    for (const token of normalizeText(value).split(' ')) {
      if (token.length > 2 && !GENERIC_TOKENS.has(token)) out.add(token);
    }
  }
  return out;
}

/**
 * Same-job-first ranking: shared bearing categories, type tags, and
 * classification dominate, so Modafinil surfaces other wakefulness
 * pharmaceuticals before botanicals that merely share effect verbs.
 * Free-text effect/marker tokens and pairing overlap only break ties.
 */
export function substanceSimilarity(base: Substance, candidate: Substance) {
  let score = 0;

  score += 25 * phraseOverlap(base.paths.map((path) => path.category), candidate.paths.map((path) => path.category));
  score += 12 * phraseOverlap(base.typeTags, candidate.typeTags);
  if (base.classification === candidate.classification) score += 8;
  score += 2 * phraseOverlap(base.administration, candidate.administration);

  // Substances that pair with the same partners tend to fill similar roles.
  score += 6 * phraseOverlap(base.possiblePairings, candidate.possiblePairings);
  if (base.possiblePairings.some((pairing) => normalizeText(pairing) === normalizeText(candidate.name))) score += 6;
  if (candidate.possiblePairings.some((pairing) => normalizeText(pairing) === normalizeText(base.name))) score += 6;

  const baseTokens = meaningfulTokens([...base.subjectiveEffects, ...(base.markers || [])]);
  const candidateTokens = meaningfulTokens([...candidate.subjectiveEffects, ...(candidate.markers || [])]);
  let shared = 0;
  baseTokens.forEach((token) => {
    if (candidateTokens.has(token)) shared += 1;
  });
  score += 2 * Math.min(shared, 10);

  return score;
}

/** Brands that carry the same substances first, then shared markers. */
export function brandSimilarity(base: Brand, candidate: Brand) {
  const baseProducts = new Set((base.products ?? []).map(normalizeText));
  const sharedProducts = (candidate.products ?? []).filter((p) => baseProducts.has(normalizeText(p))).length;
  return 10 * sharedProducts + overlapScore(base.markers ?? [], candidate.markers ?? [], 4);
}

/** Stacks that share components first, then shared "reasons" markers. */
export function stackSimilarity(base: Stack, candidate: Stack) {
  const baseIds = new Set(base.substances.map((s) => s.id));
  const sharedComponents = candidate.substances.filter((s) => baseIds.has(s.id)).length;
  return 10 * sharedComponents + overlapScore(base.markers ?? [], candidate.markers ?? [], 3);
}

export function similarity(type: CompareType, base: CompareItem, candidate: CompareItem) {
  if (type === 'substance') return substanceSimilarity(base as Substance, candidate as Substance);
  if (type === 'brand') return brandSimilarity(base as Brand, candidate as Brand);
  return stackSimilarity(base as Stack, candidate as Stack);
}

/**
 * Sorts candidates by combined similarity to every already-picked item
 * (so a third pick suits both of the first two), stable on name.
 */
export function rankCandidates<T extends CompareItem>(type: CompareType, picked: T[], candidates: T[]): T[] {
  if (picked.length === 0) return [...candidates].sort((a, b) => a.name.localeCompare(b.name));
  const scored = new Map(candidates.map((c) => [c.id, picked.reduce((sum, p) => sum + similarity(type, p, c), 0)]));
  return [...candidates].sort((a, b) => (scored.get(b.id) ?? 0) - (scored.get(a.id) ?? 0) || a.name.localeCompare(b.name));
}
