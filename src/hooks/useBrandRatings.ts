import { useState } from 'react';
import { BRANDS } from '../data/mockData';

const STORAGE_KEY = 'stackatlas_brand_ratings';
// Minimum number of ratings before an average is shown.
const MIN_RATINGS_FOR_AVERAGE = 5;

type Ratings = Record<string, number>; // brandId -> stars (0–5, quarter steps)

function read(): Ratings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Ratings) : {};
  } catch {
    return {};
  }
}

export interface BrandRatingSummary {
  /** Combined average including the current user's rating, or null if too few. */
  average: number | null;
  count: number;
  hasEnough: boolean;
  userRating: number | null;
}

/**
 * Per-user brand ratings (0–5, quarter-star increments).
 *
 * NOTE: persisted to localStorage for now. When the backend is wired this moves
 * behind `BrandRatingService` (see src/services/contracts.ts) with no UI change.
 */
export function useBrandRatings() {
  const [ratings, setRatings] = useState<Ratings>(() => read());

  const setRating = (brandId: string, stars: number) => {
    const quarter = Math.round(stars * 4) / 4; // snap to quarter
    const next = { ...ratings, [brandId]: quarter };
    setRatings(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore write failures (private mode, etc.)
    }
  };

  const getSummary = (brandId: string): BrandRatingSummary => {
    const brand = BRANDS.find((b) => b.id === brandId);
    const seedCount = brand?.ratingCount ?? 0;
    const seedAvg = brand?.userRating ?? 0;
    const userRating = ratings[brandId] ?? null;

    const count = seedCount + (userRating !== null ? 1 : 0);
    const hasEnough = count >= MIN_RATINGS_FOR_AVERAGE;
    const average =
      hasEnough && count > 0
        ? (seedAvg * seedCount + (userRating ?? 0)) / count
        : null;

    return {
      average: average !== null ? Math.round(average * 4) / 4 : null,
      count,
      hasEnough,
      userRating,
    };
  };

  return { setRating, getSummary };
}
