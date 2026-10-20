import type { Brand, Stack, Substance } from '../data/mockData';
import { brandIdentity } from './visualIdentity';
import { displayName } from './substanceName';
import type { Accent } from '../components/ui/accents';

/**
 * Picks for the Map's featured strip. Every slot is chosen from real data
 * and says why it is there; a slot with nothing honest to show is omitted.
 *   - the substance with the most linked research sources, or, when source
 *     counts are not available yet, a substance matching the user's first goal
 *   - the newest approved community stack
 *   - the highest-rated brand with at least a handful of ratings
 */
export type FeaturedTile =
  | { kind: 'substance'; substance: Substance }
  | { kind: 'stack'; members: Substance[] }
  | { kind: 'brand'; label: string; accent: Accent };

export type FeaturedReason = 'sources' | 'goal' | 'stack' | 'brand';

export interface FeaturedPick {
  key: string;
  reason: FeaturedReason;
  eyebrow: string;
  title: string;
  description: string;
  to: string;
  tile: FeaturedTile;
}

const MIN_BRAND_RATINGS = 5;

export function pickFeatured({ substances, stacks, brands, substancesById, goals }: {
  substances: Substance[];
  stacks: Stack[];
  brands: Brand[];
  substancesById: Map<string, Substance>;
  goals: string[];
}): FeaturedPick[] {
  const picks: FeaturedPick[] = [];

  const mostSourced = substances.filter((s) => (s.evidenceCount ?? 0) > 0).sort((a, b) => (b.evidenceCount ?? 0) - (a.evidenceCount ?? 0))[0];
  if (mostSourced) {
    const { primary, acronym } = displayName(mostSourced);
    picks.push({ key: `s-${mostSourced.id}`, reason: 'sources', eyebrow: `${mostSourced.evidenceCount} linked sources`, title: acronym ? `${acronym} · ${primary}` : primary, description: mostSourced.description, to: `/substance/${mostSourced.id}`, tile: { kind: 'substance', substance: mostSourced } });
  } else if (goals.length > 0) {
    const goal = goals[0];
    const match = substances.find((s) => s.paths.some((p) => p.category === goal));
    if (match) {
      const { primary, acronym } = displayName(match);
      picks.push({ key: `s-${match.id}`, reason: 'goal', eyebrow: `For your goal: ${goal}`, title: acronym ? `${acronym} · ${primary}` : primary, description: match.description, to: `/substance/${match.id}`, tile: { kind: 'substance', substance: match } });
    }
  }

  const newestStack = stacks.filter((s) => s.status === 'approved').sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
  if (newestStack) {
    const members = newestStack.substances.map((m) => substancesById.get(m.id)).filter((m): m is Substance => !!m).slice(0, 4);
    picks.push({ key: `k-${newestStack.id}`, reason: 'stack', eyebrow: 'Newest community stack', title: newestStack.name, description: newestStack.description, to: `/stack/${newestStack.id}`, tile: { kind: 'stack', members } });
  }

  const topBrand = brands.filter((b) => (b.ratingCount ?? 0) >= MIN_BRAND_RATINGS).sort((a, b) => b.userRating - a.userRating || (b.ratingCount ?? 0) - (a.ratingCount ?? 0))[0];
  if (topBrand) {
    const id = brandIdentity(topBrand);
    picks.push({ key: `b-${topBrand.id}`, reason: 'brand', eyebrow: `Top-rated brand · ${topBrand.userRating.toFixed(1)} from ${topBrand.ratingCount} ratings`, title: topBrand.name, description: topBrand.description ?? '', to: `/brand/${topBrand.id}`, tile: { kind: 'brand', label: id.label, accent: id.accent } });
  }

  return picks;
}
