// Public + admin access to the supplement/research glossary
// (supabase/migrations/20260720120000_glossary.sql). Reads go straight
// through the public-read RLS policy on glossary_terms; writes go through
// the admin_upsert_glossary_term / admin_delete_glossary_term RPCs.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface GlossaryTerm {
  id: string;
  term: string;
  slug: string;
  definition: string;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RawGlossaryTermRow {
  id: string;
  term: string;
  slug: string;
  definition: string;
  category: string | null;
  created_at: string;
  updated_at: string;
}

function fromRow(row: RawGlossaryTermRow): GlossaryTerm {
  return {
    id: row.id,
    term: row.term,
    slug: row.slug,
    definition: row.definition,
    category: row.category ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listGlossaryTerms(client: SupabaseClient): Promise<GlossaryTerm[]> {
  const { data, error } = await client
    .from('glossary_terms')
    .select('id, term, slug, definition, category, created_at, updated_at')
    .order('term', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as RawGlossaryTermRow[]).map(fromRow);
}

export interface GlossaryTermInput {
  term: string;
  definition: string;
  category?: string | null;
  slug?: string | null;
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
  });
  if (error) throw error;
  return fromRow(data as RawGlossaryTermRow);
}

export async function deleteGlossaryTerm(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.rpc('admin_delete_glossary_term', { p_id: id });
  if (error) throw error;
}
