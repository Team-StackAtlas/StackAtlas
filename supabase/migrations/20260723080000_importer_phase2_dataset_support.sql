-- Importer phase 2: schema support for externally-produced research datasets
-- with stable IDs (evidence "E0001", sources "S0001"), per HANDOFF.md §8.
--
-- Everything here is additive and safe to apply independently. The client
-- engine already sends external_ref in its import payload; until this is
-- applied the existing admin_import_sources RPC simply ignores the unknown
-- key (same graceful pattern as post_images), and the backfill RPC below is
-- called best-effort. Applying this lights up stable-ID idempotency with no
-- code changes.

-- ---------------------------------------------------------------------------
-- 1. Stable external IDs on the entities the dataset addresses
-- ---------------------------------------------------------------------------
alter table research_sources  add column if not exists external_ref text;
alter table research_findings add column if not exists external_ref text;
alter table brand_products    add column if not exists external_ref text;
alter table product_variants  add column if not exists external_ref text;

create unique index if not exists research_sources_external_ref_key
  on research_sources (external_ref) where external_ref is not null;
create unique index if not exists research_findings_external_ref_key
  on research_findings (external_ref) where external_ref is not null;
create unique index if not exists brand_products_external_ref_key
  on brand_products (external_ref) where external_ref is not null;
create unique index if not exists product_variants_external_ref_key
  on product_variants (external_ref) where external_ref is not null;

-- ---------------------------------------------------------------------------
-- 2. Product-variant natural key + history preservation
-- ---------------------------------------------------------------------------
-- Variants gain a lightweight lifecycle so re-imports never overwrite
-- history: a superseded row stays, pointing at its replacement.
alter table product_variants add column if not exists status text not null default 'current'
  check (status in ('current', 'superseded', 'unresolved'));
alter table product_variants add column if not exists superseded_by uuid
  references product_variants (id) on delete set null;

-- Idempotent upserts need a natural key; only current rows contend for it,
-- so superseding a variant frees the key for its replacement.
create unique index if not exists product_variants_natural_key
  on product_variants (
    brand_product_id,
    coalesce(variant_name, ''),
    coalesce(form, ''),
    coalesce(size, ''),
    coalesce(strength, '')
  )
  where status = 'current';

-- ---------------------------------------------------------------------------
-- 3. Future-research queue (the dataset ships 47 queued topics)
-- ---------------------------------------------------------------------------
create table if not exists research_queue (
  id uuid primary key default gen_random_uuid(),
  external_ref text unique,
  topic text not null,
  substance_id uuid references substances (id) on delete set null,
  priority integer not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'done', 'dropped')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table research_queue enable row level security;
create policy research_queue_admin_all on research_queue
  for all to authenticated
  using (is_site_admin()) with check (is_site_admin());
grant select, insert, update, delete on research_queue to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Evidence ↔ product linkage (COA-level provenance)
-- ---------------------------------------------------------------------------
-- Sources could link to substances/brands/stacks but not to a specific
-- product variant, which COAs and label documents are actually about.
-- Restrict on the variant side: evidence must be unlinked deliberately
-- before a variant row can be deleted.
create table if not exists research_source_products (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references research_sources (id) on delete cascade,
  product_variant_id uuid not null references product_variants (id) on delete restrict,
  notes text,
  created_at timestamptz not null default now(),
  unique (source_id, product_variant_id)
);

create index if not exists research_source_products_variant_idx
  on research_source_products (product_variant_id);

alter table research_source_products enable row level security;
create policy research_source_products_admin_all on research_source_products
  for all to authenticated
  using (is_site_admin()) with check (is_site_admin());
grant select, insert, update, delete on research_source_products to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Backfill RPC: attach external refs to already-imported sources
-- ---------------------------------------------------------------------------
-- The engine calls this after admin_import_sources so stable IDs attach to
-- rows matched by their existing natural identity (content_hash, pmid, doi,
-- or url — checked in that order). Kept separate from the big import RPC so
-- this migration doesn't have to restate it. Idempotent; conflicting refs
-- are reported, not forced.
create or replace function admin_set_source_external_refs(p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  item jsonb;
  v_ref text; v_hash text; v_pmid text; v_doi text; v_url text;
  v_id uuid;
  updated integer := 0; missed integer := 0;
  errors jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not is_site_admin() then
    raise exception 'site_admin or site_owner role is required';
  end if;
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array';
  end if;

  for item in select value from jsonb_array_elements(p_rows) loop
    begin
      v_ref := nullif(btrim(item->>'external_ref'), '');
      if v_ref is null then continue; end if;
      v_hash := nullif(btrim(item->>'content_hash'), '');
      v_pmid := nullif(btrim(item->>'pmid'), '');
      v_doi  := nullif(btrim(item->>'doi'), '');
      v_url  := nullif(btrim(item->>'url'), '');

      select id into v_id from research_sources
      where (v_hash is not null and content_hash = v_hash)
         or (v_pmid is not null and pmid = v_pmid)
         or (v_doi  is not null and doi = v_doi)
         or (v_url  is not null and url = v_url)
      order by (content_hash = v_hash) desc nulls last,
               (pmid = v_pmid) desc nulls last,
               (doi = v_doi) desc nulls last
      limit 1;

      if v_id is null then
        missed := missed + 1;
        continue;
      end if;

      update research_sources set external_ref = v_ref
      where id = v_id
        and (external_ref is null or external_ref = v_ref);
      if found then updated := updated + 1; else missed := missed + 1; end if;
    exception when others then
      errors := errors || jsonb_build_object('external_ref', v_ref, 'error', sqlerrm);
    end;
  end loop;

  return jsonb_build_object('updated', updated, 'missed', missed, 'errors', errors);
end $$;

revoke all on function admin_set_source_external_refs(jsonb) from public, anon, authenticated;
grant execute on function admin_set_source_external_refs(jsonb) to authenticated;

notify pgrst, 'reload schema';
