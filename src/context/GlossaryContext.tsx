import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../services/supabase/client';
import { listGlossaryTerms, type GlossaryTerm } from '../services/glossary';
import { MOCK_GLOSSARY_TERMS } from '../data/mockGlossary';
import { buildGlossaryMatcher } from '../lib/glossaryMatcher';

interface GlossaryContextValue {
  /** All loaded terms, in load order. */
  terms: GlossaryTerm[];
  /** Lowercased term text -> term. */
  byLower: Map<string, GlossaryTerm>;
  /** Compiled matcher for all terms (longest-first, word-boundary aware), or null if none loaded. */
  matcher: RegExp | null;
}

const GlossaryContext = createContext<GlossaryContextValue | undefined>(undefined);

/**
 * Loads the glossary once and exposes a matcher so any prose can be scanned for
 * defined terms and made interactive (see GlossaryText). Fails soft: if the
 * glossary can't load, `matcher` stays null and text renders unchanged.
 */
export function GlossaryProvider({ children }: { children: ReactNode }) {
  // Seeded at init rather than in an effect: without a backend the terms are
  // already known, so setting them synchronously in an effect only bought an
  // extra render pass during which inline term-linking was still inert.
  const [terms, setTerms] = useState<GlossaryTerm[]>(() => (supabase ? [] : MOCK_GLOSSARY_TERMS));

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    listGlossaryTerms(supabase)
      .then((rows) => {
        if (!cancelled) setTerms(rows);
      })
      .catch(() => {
        // Non-fatal: term linking simply stays off.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<GlossaryContextValue>(() => {
    const byLower = new Map<string, GlossaryTerm>();
    for (const t of terms) {
      const key = t.term.toLowerCase();
      if (!byLower.has(key)) byLower.set(key, t);
    }
    return { terms, byLower, matcher: buildGlossaryMatcher(terms.map((t) => t.term)) };
  }, [terms]);

  return <GlossaryContext.Provider value={value}>{children}</GlossaryContext.Provider>;
}

export function useGlossary(): GlossaryContextValue {
  const ctx = useContext(GlossaryContext);
  if (!ctx) throw new Error('useGlossary must be used within a GlossaryProvider');
  return ctx;
}
