import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { guessUnitSystem } from '../lib/units';
import type { UnitSystem } from '../services/types';

const KEY = 'stackatlas_units';

function readLocal(): UnitSystem | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'imperial' || v === 'metric' ? v : null;
  } catch {
    return null;
  }
}

/**
 * The viewer's unit system: the signed-in profile's setting when there is
 * one, otherwise the device's remembered choice, otherwise a guess from the
 * browser locale. Stored metric everywhere; this only affects display.
 */
export function useUnitSystem(): [UnitSystem, (next: UnitSystem) => void] {
  const { profile } = useAuth();
  const [local, setLocal] = useState<UnitSystem | null>(readLocal);
  const system: UnitSystem = profile?.settings?.unitSystem ?? local ?? guessUnitSystem();

  // Keep the device copy in step with the account so a signed-out visit on
  // the same device still shows the units this person chose.
  const fromProfile = profile?.settings?.unitSystem;
  useEffect(() => {
    if (!fromProfile) return;
    try { localStorage.setItem(KEY, fromProfile); } catch { /* storage unavailable */ }
  }, [fromProfile]);

  const set = useCallback((next: UnitSystem) => {
    try { localStorage.setItem(KEY, next); } catch { /* storage unavailable */ }
    setLocal(next);
  }, []);

  return [system, set];
}
