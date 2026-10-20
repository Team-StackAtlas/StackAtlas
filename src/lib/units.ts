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

/** Fixed brackets, so nobody lists themselves as "18–99". */
export const AGE_RANGES: { min: number; max: number | null; label: string }[] = [
  { min: 18, max: 24, label: '18–24' },
  { min: 25, max: 34, label: '25–34' },
  { min: 35, max: 44, label: '35–44' },
  { min: 45, max: 54, label: '45–54' },
  { min: 55, max: 64, label: '55–64' },
  { min: 65, max: null, label: '65+' },
];

export function ageRangeLabel(age: number) {
  const hit = AGE_RANGES.find((r) => age >= r.min && (r.max === null || age <= r.max));
  return hit?.label ?? AGE_RANGES[0].label;
}

export function formatAge(birthYear: number, display: 'exact' | 'range', now = new Date()) {
  const age = ageFromBirthYear(birthYear, now);
  return display === 'range' ? ageRangeLabel(age) : String(age);
}
