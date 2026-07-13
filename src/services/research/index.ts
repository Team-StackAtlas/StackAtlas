// Public read-only access to APPROVED research findings, for the substance
// page's "Research Findings" section. Mirrors the column names used by the
// admin research tools (src/services/import/runner.ts's listFindings /
// listSourceLibrary) against research_findings / research_sources — RLS
// (supabase/migrations/20260713043000_public_approved_findings.sql) only
// exposes rows with review_status = 'approved' to anon/authenticated.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface PublicFinding {
  id: string;
  endpoint: string;
  direction: 'increased' | 'decreased' | 'no_clear_change' | 'mixed' | 'unclear';
  summary: string;
  population: string | null;
  doseAmount: number | null;
  doseUnit: string | null;
  frequency: string | null;
  duration: string | null;
  studyType: string | null;
  limitations: string | null;
  source: {
    title: string;
    url: string | null;
    doi: string | null;
    pmid: string | null;
    publication: string | null;
    year: number | null;
    sourceType: string | null;
  } | null;
}

interface RawSourceRow {
  title: string;
  url: string | null;
  doi: string | null;
  pmid: string | null;
  journal_or_site: string | null;
  year: number | null;
  source_type: string | null;
}

interface RawFindingRow {
  id: string;
  endpoint: string;
  direction: PublicFinding['direction'];
  finding_summary: string;
  population: string | null;
  dose_amount: number | null;
  dose_unit: string | null;
  frequency: string | null;
  duration: string | null;
  study_type: string | null;
  limitations: string | null;
  research_sources: RawSourceRow | null;
}

const FINDINGS_SELECT =
  'id, endpoint, direction, finding_summary, population, dose_amount, dose_unit, frequency, duration, study_type, limitations, research_sources(title, url, doi, pmid, journal_or_site, year, source_type), substances!inner(slug)';

export async function listApprovedFindings(
  client: SupabaseClient,
  substanceSlug: string,
): Promise<PublicFinding[]> {
  const { data, error } = await client
    .from('research_findings')
    .select(FINDINGS_SELECT)
    .eq('substances.slug', substanceSlug)
    .eq('review_status', 'approved')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as RawFindingRow[]).map((row) => ({
    id: row.id,
    endpoint: row.endpoint,
    direction: row.direction,
    summary: row.finding_summary,
    population: row.population ?? null,
    doseAmount: row.dose_amount ?? null,
    doseUnit: row.dose_unit ?? null,
    frequency: row.frequency ?? null,
    duration: row.duration ?? null,
    studyType: row.study_type ?? null,
    limitations: row.limitations ?? null,
    source: row.research_sources
      ? {
          title: row.research_sources.title,
          url: row.research_sources.url ?? null,
          doi: row.research_sources.doi ?? null,
          pmid: row.research_sources.pmid ?? null,
          publication: row.research_sources.journal_or_site ?? null,
          year: row.research_sources.year ?? null,
          sourceType: row.research_sources.source_type ?? null,
        }
      : null,
  }));
}
