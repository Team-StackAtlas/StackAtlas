-- Glossary of supplement/research terms: public read-only, admin-managed.
--
-- Table + SECURITY DEFINER RPCs for writes (production force-enables RLS via
-- an event trigger, so glossary_terms needs explicit policies + grants or it
-- is deny-all). This is low-stakes content — no per-term audit log.

create table if not exists glossary_terms (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  slug text not null unique,
  definition text not null,
  category text,
  created_by uuid references users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists glossary_terms_slug_lower_idx on glossary_terms (lower(slug));

alter table glossary_terms enable row level security;
drop policy if exists glossary_terms_public_read on glossary_terms;
create policy glossary_terms_public_read on glossary_terms for select using (true);
grant select on glossary_terms to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create or replace function admin_upsert_glossary_term(
  p_term text,
  p_definition text,
  p_category text default null,
  p_slug text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_term text;
  v_definition text;
  v_category text;
  v_slug text;
  v_row jsonb;
begin
  if auth.uid() is null or not is_site_admin() then raise exception 'site_admin or site_owner role is required'; end if;

  v_term := nullif(btrim(p_term), '');
  if v_term is null then raise exception 'term is required'; end if;
  v_definition := nullif(btrim(p_definition), '');
  if v_definition is null then raise exception 'definition is required'; end if;
  v_category := nullif(btrim(p_category), '');

  v_slug := nullif(btrim(p_slug), '');
  if v_slug is null then
    v_slug := btrim(regexp_replace(lower(v_term), '[^a-z0-9]+', '-', 'g'), '-');
  end if;
  if v_slug = '' then raise exception 'unable to derive a slug from term'; end if;

  -- Strip language-guardrail words from both term and definition (word
  -- boundary, case-insensitive), then collapse any resulting extra spaces.
  v_term := btrim(regexp_replace(
    regexp_replace(v_term, '\y(recommended|proven|best|safe|effective)\y', '', 'gi'),
    '\s+', ' ', 'g'
  ));
  v_definition := btrim(regexp_replace(
    regexp_replace(v_definition, '\y(recommended|proven|best|safe|effective)\y', '', 'gi'),
    '\s+', ' ', 'g'
  ));
  if v_term = '' then raise exception 'term is required'; end if;
  if v_definition = '' then raise exception 'definition is required'; end if;

  insert into glossary_terms as g (term, slug, definition, category, created_by, updated_at)
  values (v_term, v_slug, v_definition, v_category, auth.uid(), now())
  on conflict (slug) do update set
    term = excluded.term,
    definition = excluded.definition,
    category = excluded.category,
    updated_at = now()
  returning to_jsonb(g.*) into v_row;

  return v_row;
end $$;

create or replace function admin_delete_glossary_term(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not is_site_admin() then raise exception 'site_admin or site_owner role is required'; end if;
  delete from glossary_terms where id = p_id;
end $$;

revoke all on function admin_upsert_glossary_term(text, text, text, text) from public, anon, authenticated;
revoke all on function admin_delete_glossary_term(uuid) from public, anon, authenticated;
grant execute on function admin_upsert_glossary_term(text, text, text, text) to authenticated;
grant execute on function admin_delete_glossary_term(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Seed: ~30 neutral supplement/research terms. Definitions describe what a
-- term means, not endorsements — no recommended/proven/best/safe/effective.
-- ---------------------------------------------------------------------------

insert into glossary_terms (term, slug, definition, category) values
  ('COA (Certificate of Analysis)', 'coa-certificate-of-analysis', 'A document from a testing lab that reports what was found in a specific batch of a product, such as measured potency and screened contaminants.', 'Testing & Quality'),
  ('Third-Party Testing', 'third-party-testing', 'Lab analysis performed by an organization independent of the manufacturer or seller, used to verify what is actually in a product.', 'Testing & Quality'),
  ('Half-Life', 'half-life', 'The time it takes for the concentration of a substance in the body to fall to half of its starting level.', 'Pharmacology'),
  ('Bioavailability', 'bioavailability', 'The proportion of an ingested substance that reaches systemic circulation in an active form, as opposed to being broken down or excreted unabsorbed.', 'Pharmacology'),
  ('Adaptogen', 'adaptogen', 'A category label applied to certain plant or fungal substances that are studied for their potential to modulate the body''s stress-response systems.', 'Classification'),
  ('Nootropic', 'nootropic', 'A broad term for substances studied or marketed in relation to cognitive functions such as memory, focus, or mental processing.', 'Classification'),
  ('SARM', 'sarm', 'Selective Androgen Receptor Modulator: a class of compounds designed to bind androgen receptors with tissue selectivity distinct from anabolic steroids.', 'Classification'),
  ('Peptide', 'peptide', 'A short chain of amino acids linked by peptide bonds, shorter than a full protein.', 'Chemistry'),
  ('Prohormone', 'prohormone', 'A precursor compound that the body can convert into a hormone through metabolic processes.', 'Chemistry'),
  ('Standardized Extract', 'standardized-extract', 'A plant or botanical extract manufactured to contain a consistent, specified amount of one or more marker compounds from batch to batch.', 'Manufacturing'),
  ('Chelate', 'chelate', 'A compound in which a mineral ion is bound to an organic molecule, a form used in some mineral supplements.', 'Chemistry'),
  ('Loading Phase', 'loading-phase', 'An initial period of higher-dose intake used in some supplementation protocols before switching to a lower maintenance dose.', 'Usage Patterns'),
  ('Cycling', 'cycling', 'A pattern of alternating periods of use and non-use of a substance over defined intervals.', 'Usage Patterns'),
  ('Tolerance', 'tolerance', 'A reduction in a substance''s effect over repeated exposure, often requiring a higher dose to reach the same response.', 'Pharmacology'),
  ('Stack', 'stack', 'A combination of two or more substances taken together, typically organized around a shared goal.', 'Usage Patterns'),
  ('Bulk/Cut', 'bulk-cut', 'Terms from bodybuilding nomenclature describing phases of intentional caloric surplus (bulk) or deficit (cut) relative to body composition goals.', 'Usage Patterns'),
  ('Racetam', 'racetam', 'A chemical class of compounds sharing a pyrrolidone core structure, studied in the context of cognition.', 'Chemistry'),
  ('Secretagogue', 'secretagogue', 'A substance that triggers or promotes the secretion of another substance, such as a hormone, from a cell or gland.', 'Pharmacology'),
  ('Postbiotic', 'postbiotic', 'A byproduct or metabolite generated by microorganisms, such as short-chain fatty acids, studied for its effects independent of live bacteria.', 'Classification'),
  ('Prebiotic', 'prebiotic', 'A substrate, typically a type of fiber, that is selectively used by beneficial microorganisms in the gut.', 'Classification'),
  ('Probiotic (Strain-Specificity)', 'probiotic-strain-specificity', 'Live microorganisms studied for their effects on the host; research findings for one bacterial strain do not necessarily generalize to other strains of the same species.', 'Classification'),
  ('Ester', 'ester', 'A chemical modification formed by combining an acid with an alcohol, often used to alter a compound''s solubility or absorption profile.', 'Chemistry'),
  ('Prodrug', 'prodrug', 'A compound that is administered in an inactive or less-active form and converted into its active form through metabolism after administration.', 'Pharmacology'),
  ('Isomer', 'isomer', 'One of two or more compounds with the same molecular formula but a different arrangement of atoms, which can result in different biological activity.', 'Chemistry'),
  ('PCT (Post-Cycle Therapy)', 'pct-post-cycle-therapy', 'A protocol some individuals follow after a cycle of hormonally active compounds, intended to address changes in the body''s own hormone production during that cycle.', 'Usage Patterns'),
  ('RCT (Randomized Controlled Trial)', 'rct-randomized-controlled-trial', 'A study design in which participants are randomly assigned to an intervention or control group to reduce bias when comparing outcomes.', 'Research Methods'),
  ('Meta-analysis', 'meta-analysis', 'A statistical method that combines results from multiple independent studies on the same question to produce a pooled estimate.', 'Research Methods'),
  ('In Vitro', 'in-vitro', 'Research conducted outside a living organism, such as in a test tube or cell culture, as distinct from studies in living systems.', 'Research Methods'),
  ('In Vivo', 'in-vivo', 'Research conducted within a living organism, such as an animal or human study, as distinct from in vitro work.', 'Research Methods'),
  ('Endogenous', 'endogenous', 'Originating from within the body, as opposed to being introduced from an external source.', 'Pharmacology')
on conflict (slug) do nothing;

notify pgrst, 'reload schema';
