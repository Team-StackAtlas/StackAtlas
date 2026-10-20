import type { Sex, UnitSystem } from '../services/types';

/**
 * Body stats are stored metric (kg, cm) and converted at the edge. Posts are
 * never auto-converted — only profile stats are — so nobody's "ran 100mg"
 * turns into something strange. See ConvertibleText for the opt-in tap.
 */

export const LB_PER_KG = 2.2046226218;
export const CM_PER_IN = 2.54;

export const WEIGHT_KG = { min: 20, max: 500 } as const;
export const HEIGHT_CM = { min: 90, max: 260 } as const;
export const BODY_FAT = { min: 1, max: 75 } as const;
export const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'intersex', label: 'Intersex' },
];

/** Regions whose everyday units are imperial. Everyone else defaults to metric. */
const IMPERIAL_REGIONS = new Set(['US', 'LR', 'MM']);

export function guessUnitSystem(): UnitSystem {
  if (typeof navigator === 'undefined') return 'metric';
  const region = navigator.language?.split(/[-_]/)[1]?.toUpperCase();
  return region && IMPERIAL_REGIONS.has(region) ? 'imperial' : 'metric';
}

export const kgToLb = (kg: number) => kg * LB_PER_KG;
export const lbToKg = (lb: number) => lb / LB_PER_KG;
export const cmToIn = (cm: number) => cm / CM_PER_IN;
export const inToCm = (inches: number) => inches * CM_PER_IN;

export function cmToFtIn(cm: number): { feet: number; inches: number } {
  const total = Math.round(cmToIn(cm));
  return { feet: Math.floor(total / 12), inches: total % 12 };
}

export function formatWeight(kg: number, system: UnitSystem) {
  return system === 'imperial' ? `${Math.round(kgToLb(kg))} lb` : `${Math.round(kg * 10) / 10} kg`;
}

export function formatHeight(cm: number, system: UnitSystem) {
  if (system === 'metric') return `${Math.round(cm)} cm`;
  const { feet, inches } = cmToFtIn(cm);
  return `${feet}′${inches}″`;
}

// --- age -------------------------------------------------------------------

export const MIN_AGE = 18;
export const MAX_AGE = 120;

export function birthYearBounds(now = new Date()) {
  const year = now.getFullYear();
  return { min: year - MAX_AGE, max: year - MIN_AGE };
}

/** Age as of now, give or take the months until their birthday. */
export function ageFromBirthYear(birthYear: number, now = new Date()) {
  return now.getFullYear() - birthYear;
}

export const AGE_RANGE_SPAN = { min: 3, max: 10, default: 5 } as const;

/**
 * Brackets are anchored at 18 and stepped by the chosen span, then the one
 * containing the real age is shown: span 4 at age 25 gives 22–25, span 10
 * gives 18–27. Nobody can list themselves as "18–99", and the bracket rolls
 * over on its own as they age.
 */
export function ageRangeLabel(age: number, span: number = AGE_RANGE_SPAN.default) {
  const width = Math.min(AGE_RANGE_SPAN.max, Math.max(AGE_RANGE_SPAN.min, Math.round(span)));
  const start = MIN_AGE + Math.floor((Math.max(age, MIN_AGE) - MIN_AGE) / width) * width;
  return `${start}–${start + width - 1}`;
}

export function formatAge(birthYear: number, display: 'exact' | 'range', span?: number, now = new Date()) {
  const age = ageFromBirthYear(birthYear, now);
  return display === 'range' ? ageRangeLabel(age, span) : String(age);
}
