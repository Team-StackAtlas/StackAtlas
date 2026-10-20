// Public + admin access to the supplement/research glossary
// (supabase/migrations/20260720120000_glossary.sql). Reads go straight
// through the public-read RLS policy on glossary_terms; writes go through
// the admin_upsert_glossary_term / admin_delete_glossary_term RPCs.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface GlossaryTerm {
  id: string;
  term: string;
  slug: string;
  /** One or two sentences: what the tooltip shows. */
  definition: string;
  /** Optional longer paragraph, full entry only. */
  detail: string | null;
  /** What kind of word it is (Pharmacology, Usage Patterns, …). */
  category: string | null;
  /** How the word is used (slang, safety, lab-report). */
  tags: string[];
  /** 0–5 goal bearings from the site vocabulary. */
  bearings: string[];
  createdAt: string;
  updatedAt: string;
}

/** Tags with a fixed meaning in the UI. Anything else is shown as plain text. */
export const GLOSSARY_TAGS = {
  slang: 'Slang',
  safety: 'Safety',
  'lab-report': 'Lab report',
} as const;

interface RawGlossaryTermRow {
  id: string;
  term: string;
  slug: string;
  definition: string;
  detail?: string | null;
  category: string | null;
  tags?: string[] | null;
  bearings?: string[] | null;
  created_at: string;
  updated_at: string;
}

function fromRow(row: RawGlossaryTermRow): GlossaryTerm {
  return {
    id: row.id,
    term: row.term,
    slug: row.slug,
    definition: row.definition,
    detail: row.detail ?? null,
    category: row.category ?? null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    bearings: Array.isArray(row.bearings) ? row.bearings : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listGlossaryTerms(client: SupabaseClient): Promise<GlossaryTerm[]> {
  const { data, error } = await client
    .from('glossary_terms')
    .select('*')
    .order('term', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as RawGlossaryTermRow[]).map(fromRow);
}

export interface GlossaryTermInput {
  term: string;
  definition: string;
  category?: string | null;
  slug?: string | null;
  detail?: string | null;
  tags?: string[];
  bearings?: string[];
}

export async function upsertGlossaryTerm(
  client: SupabaseClient,
  input: GlossaryTermInput,
): Promise<GlossaryTerm> {
  const { data, error } = await client.rpc('admin_upsert_glossary_term', {
    p_term: input.term,
    p_definition: input.definition,
    p_category: input.category ?? null,
    p_slug: input.slug ?? null,
    p_detail: input.detail ?? null,
    p_tags: input.tags ?? [],
    p_bearings: input.bearings ?? [],
  });
  if (error) throw error;
  return fromRow(data as RawGlossaryTermRow);
}

export async function deleteGlossaryTerm(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.rpc('admin_delete_glossary_term', { p_id: id });
  if (error) throw error;
}
