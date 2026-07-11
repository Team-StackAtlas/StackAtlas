import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { SUBSTANCES, BRANDS, STACKS, type Substance, type Brand, type Stack } from '../data/mockData';
import { supabase, isBackendConfigured } from '../services/supabase/client';
import { loadSupabaseCatalog } from '../services/catalog';

interface CatalogContextValue {
  substances: Substance[];
  brands: Brand[];
  stacks: Stack[];
  loading: boolean;
  source: 'supabase' | 'mock';
}

const CatalogContext = createContext<CatalogContextValue | undefined>(undefined);

/**
 * Serves the mock catalog immediately so pages never render an empty state
 * while Supabase loads, then swaps in Supabase data (once, on mount) if it's
 * configured and returns at least some substances. Brands/stacks fall back to
 * mock individually if Supabase returned substances but not those.
 */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<CatalogContextValue>({
    substances: SUBSTANCES,
    brands: BRANDS,
    stacks: STACKS,
    loading: isBackendConfigured,
    source: 'mock',
  });

  useEffect(() => {
    if (!isBackendConfigured || !supabase) return;
    let cancelled = false;

    loadSupabaseCatalog(supabase).then((result) => {
      if (cancelled) return;
      if (!result || result.substances.length === 0) {
        setValue((current) => ({ ...current, loading: false }));
        return;
      }
      setValue({
        substances: result.substances,
        brands: result.brands.length > 0 ? result.brands : BRANDS,
        stacks: result.stacks.length > 0 ? result.stacks : STACKS,
        loading: false,
        source: 'supabase',
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used within a CatalogProvider');
  return ctx;
}
