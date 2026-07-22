import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../services/supabase/client';
import { listGlossaryTerms, type GlossaryTerm } from '../services/glossary';
import { MOCK_GLOSSARY_TERMS } from '../data/mockGlossary';

interface GlossaryContextValue {
  /** Lowercased term text -> term. */
  byLower: Map<string, GlossaryTerm>;
  /** Compiled matcher for all terms (longest-first, word-boundary aware), or null if none loaded. */
  matcher: RegExp | null;
}

const GlossaryContext = createContext<GlossaryContextValue | undefined>(undefined);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Loads the glossary once and exposes a matcher so any prose can be scanned for
 * defined terms and made interactive (see GlossaryText). Fails soft: if the
 * glossary can't load, `matcher` stays null and text renders unchanged.
 */
export function GlossaryProvider({ children }: { children: ReactNode }) {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);

  useEffect(() => {
    if (!supabase) {
      // No backend: the seed glossary keeps inline term-linking alive in demos.
      setTerms(MOCK_GLOSSARY_TERMS);
      return;
    }
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
    if (terms.length === 0) return { byLower, matcher: null };

    // Longest terms first so "Branched-Chain Amino Acid" wins over "Amino Acid".
    const alternation = terms
      .map((t) => t.term)
      .sort((a, b) => b.length - a.length)
      .map(escapeRegExp)
      .join('|');
    // Boundaries that respect letters, digits, and hyphens (so "Half-Life" and
    // "GABA" match as whole terms, not inside longer words).
    const matcher = new RegExp(`(?<![A-Za-z0-9-])(${alternation})(?![A-Za-z0-9-])`, 'gi');
    return { byLower, matcher };
  }, [terms]);

  return <GlossaryContext.Provider value={value}>{children}</GlossaryContext.Provider>;
}

export function useGlossary(): GlossaryContextValue {
  const ctx = useContext(GlossaryContext);
  if (!ctx) throw new Error('useGlossary must be used within a GlossaryProvider');
  return ctx;
}
