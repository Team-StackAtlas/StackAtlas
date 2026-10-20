import { describe, expect, it } from 'vitest';
import { ageRangeLabel, birthYearBounds, cmToFtIn, formatAge, formatHeight, formatWeight, lbToKg } from '../units';

describe('units', () => {
  it('formats weight in the viewer system', () => {
    expect(formatWeight(80, 'metric')).toBe('80 kg');
    expect(formatWeight(80, 'imperial')).toBe('176 lb');
    expect(Math.round(lbToKg(176))).toBe(80);
  });

  it('formats height as cm or feet/inches', () => {
    expect(formatHeight(180.3, 'metric')).toBe('180 cm');
    expect(formatHeight(180.3, 'imperial')).toBe('5′11″');
    expect(cmToFtIn(182.88)).toEqual({ feet: 6, inches: 0 });
  });

  it('derives age from birth year so it ticks over on its own', () => {
    const now = new Date('2030-06-01');
    expect(formatAge(2000, 'exact', now)).toBe('30');
    expect(formatAge(2000, 'range', now)).toBe('25–34');
    expect(ageRangeLabel(70)).toBe('65+');
    expect(birthYearBounds(now)).toEqual({ min: 1910, max: 2012 });
  });
});
