-- 0016: Research & catalog data import system.
--
-- Convergence migration: production never received repo migrations 0014/0015
-- (its migration history diverged after the run-based research reverts), so
-- every statement here is idempotent and produces the same target state
-- whether or not those migrations were applied.
--
-- Contents:
--   1. Role helper functions (recreated defensively).
--   2. Public-read RLS policies + grants for the catalog and vocab tables
--      (production force-enables RLS on all tables via an event trigger, so
--      tables without policies are deny-all today).
--   3. Substance enrichment columns (origin, how_obtained, half_life) and
--      substance_aliases.
--   4. Research tables: research_sources rework, research_source_substances,
--      research_import_batches (extended), research_findings.
--   5. Import RPCs (SECURITY DEFINER, role-checked in the body) that accept
--      natural keys (slugs, pmid/doi/url) and upsert server-side.
--   6. PostgREST schema reload.

-- ---------------------------------------------------------------------------
-- 1. Role helpers
-- ---------------------------------------------------------------------------

create or replace function is_site_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p where p.id = auth.uid() and p.site_role in ('site_admin', 'site_owner'));
$$;

create or replace function is_site_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p where p.id = auth.uid() and p.site_role = 'site_owner');
$$;

-- RLS policies call these with the querying role's privileges, so anon needs
-- execute too (it simply gets `false` back).
grant execute on function is_site_admin() to anon, authenticated;
grant execute on function is_site_owner() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Catalog read access
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'substances', 'substance_routes', 'substance_type_tags',
    'substance_administration_methods', 'substance_markers',
    'substance_pairings', 'substance_effects',
    'brands', 'brand_products', 'brand_ingredients', 'brand_health_labels',
    'stacks', 'stack_components',
    'type_tags', 'administration_methods', 'markers', 'bearings',
    'category_routes', 'sources', 'posts', 'post_bearings'
  ] loop
    execute format('alter table if exists %I enable row level security', t);
    if to_regclass(t) is not null then
      execute format('drop policy if exists %I on %I', t || '_public_read', t);
      execute format('create policy %I on %I for select using (true)', t || '_public_read', t);
      execute format('grant select on %I to anon, authenticated', t);
    end if;
  end loop;
end $$;

-- moderation_queue had RLS enabled in production with no policies at all.
alter table if exists moderation_queue enable row level security;
drop policy if exists moderation_queue_site_admin_all on moderation_queue;
create policy moderation_queue_site_admin_all on moderation_queue
  for all using (is_site_admin()) with check (is_site_admin());
grant select, insert, update, delete on moderation_queue to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Substance enrichment + aliases
-- ---------------------------------------------------------------------------

alter table substances add column if not exists origin text;
alter table substances add column if not exists how_obtained text;
alter table substances add column if not exists half_life text;

create table if not exists substance_aliases (
  id uuid primary key default gen_random_uuid(),
  substance_id uuid not null references substances (id) on delete cascade,
  alias text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists substance_aliases_alias_unique on substance_aliases (lower(alias));

alter table substance_aliases enable row level security;
drop policy if exists substance_aliases_public_read on substance_aliases;
create policy substance_aliases_public_read on substance_aliases for select using (true);
grant select on substance_aliases to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Research tables
-- ---------------------------------------------------------------------------

-- research_sources exists in every environment (0012) but production still
-- has the run-based shape. Sources are no longer tied to a single substance.
alter table research_sources alter column substance_id drop not null;
alter table research_sources alter column research_run_id drop not null;

create table if not exists research_source_substances (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references research_sources (id) on delete cascade,
  substance_id uuid not null references substances (id) on delete restrict,
  notes text,
  created_by uuid references users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (source_id, substance_id)
);

create table if not exists research_import_batches (
  id uuid primary key default gen_random_uuid(),
  imported_by uuid references users (id) on delete set null default auth.uid(),
  row_count integer not null default 0,
  imported_count integer not null default 0,
  skipped_count integer not null default 0,
  error_count integer not null default 0,
  notes text,
  created_at timestamptz not null default now()
);
alter table research_import_batches add column if not exists label text;
alter table research_import_batches add column if not exists schema_version integer;
alter table research_import_batches add column if not exists generated_by text;
alter table research_import_batches add column if not exists entity_counts jsonb;

create table if not exists research_findings (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references research_sources (id) on delete cascade,
  substance_id uuid not null references substances (id) on delete cascade,
  endpoint text not null,
  direction text not null check (direction in ('increased', 'decreased', 'no_clear_change', 'mixed', 'unclear')),
  finding_summary text not null,
  population text,
  dose_amount numeric,
  dose_unit text check (dose_unit is null or dose_unit in ('mcg', 'mg', 'g', 'IU', 'mL', 'cc')),
  frequency text,
  duration text,
  study_type text check (study_type is null or study_type in ('human_rct', 'human_observational', 'review', 'meta_analysis', 'animal', 'in_vitro', 'mechanistic', 'official_document', 'other')),
  limitations text,
  review_status text not null default 'pending_review' check (review_status in ('pending_review', 'approved', 'rejected', 'archived')),
  dedup_key text not null unique,
  created_by uuid references users (id) on delete set null,
  reviewed_by uuid references users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table research_sources enable row level security;
alter table research_source_substances enable row level security;
alter table research_import_batches enable row level security;
alter table research_findings enable row level security;

-- Reads for admins; all writes go through the SECURITY DEFINER RPCs below.
drop policy if exists research_sources_site_admin_all on research_sources;
drop policy if exists research_sources_site_admin_read on research_sources;
create policy research_sources_site_admin_read on research_sources for select using (is_site_admin());

drop policy if exists research_source_substances_site_admin_all on research_source_substances;
drop policy if exists research_source_substances_site_admin_read on research_source_substances;
create policy research_source_substances_site_admin_read on research_source_substances for select using (is_site_admin());

drop policy if exists research_import_batches_site_owner_all on research_import_batches;
drop policy if exists research_import_batches_site_owner_read on research_import_batches;
drop policy if exists research_import_batches_site_admin_read on research_import_batches;
create policy research_import_batches_site_admin_read on research_import_batches for select using (is_site_admin());

drop policy if exists research_findings_site_admin_read on research_findings;
create policy research_findings_site_admin_read on research_findings for select using (is_site_admin());

grant select on research_sources, research_source_substances, research_import_batches, research_findings to authenticated;

-- The PR 47/48 RPCs are superseded by the pack importers below.
drop function if exists owner_bulk_import_research_sources(jsonb);
drop function if exists admin_add_research_source(jsonb);
drop function if exists upsert_research_source_from_row(jsonb);
drop function if exists normalize_research_source_row(jsonb);

-- ---------------------------------------------------------------------------
-- 5. Import RPCs
-- ---------------------------------------------------------------------------

create or replace function import_slugify(p text)
returns text language sql immutable as $$
  select btrim(regexp_replace(lower(coalesce(p, '')), '[^a-z0-9]+', '-', 'g'), '-');
$$;

-- Resolve a substance reference (slug, alias, or exact name; case-insensitive).
create or replace function import_resolve_substance(p_ref text)
returns uuid language plpgsql stable security definer set search_path = public as $$
declare v_id uuid; v text := lower(btrim(coalesce(p_ref, '')));
begin
  if v = '' then return null; end if;
  select id into v_id from substances where lower(slug) = v;
  if v_id is null then
    select substance_id into v_id from substance_aliases where lower(alias) = v;
  end if;
  if v_id is null then
    select id into v_id from substances where lower(name) = v;
  end if;
  return v_id;
end $$;

create or replace function admin_create_import_batch(p_meta jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null or not is_site_admin() then raise exception 'site_admin or site_owner role is required'; end if;
  insert into research_import_batches (imported_by, label, schema_version, generated_by, row_count, notes)
  values (
    auth.uid(),
    nullif(btrim(p_meta->>'label'), ''),
    nullif(btrim(p_meta->>'schema_version'), '')::integer,
    nullif(btrim(p_meta->>'generated_by'), ''),
    coalesce(nullif(btrim(p_meta->>'row_count'), '')::integer, 0),
    nullif(btrim(p_meta->>'notes'), '')
  )
  returning id into v_id;
  return v_id;
end $$;

create or replace function admin_finalize_import_batch(p_batch_id uuid, p_counts jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not is_site_admin() then raise exception 'site_admin or site_owner role is required'; end if;
  update research_import_batches
  set imported_count = coalesce(nullif(btrim(p_counts->>'imported_count'), '')::integer, imported_count),
      skipped_count = coalesce(nullif(btrim(p_counts->>'skipped_count'), '')::integer, skipped_count),
      error_count = coalesce(nullif(btrim(p_counts->>'error_count'), '')::integer, error_count),
      entity_counts = coalesce(p_counts->'entity_counts', entity_counts)
  where id = p_batch_id and (imported_by = auth.uid() or is_site_owner());
end $$;

-- Upsert one vocab label into a slug/label table; returns the row id.
create or replace function import_upsert_type_tag(p_label text) returns uuid
language sql security definer set search_path = public as $$
  insert into type_tags as t (slug, label) values (import_slugify(p_label), btrim(p_label))
  on conflict (slug) do update set label = t.label
  returning id;
$$;

create or replace function import_upsert_administration_method(p_label text) returns uuid
language sql security definer set search_path = public as $$
  insert into administration_methods as t (slug, label) values (import_slugify(p_label), btrim(p_label))
  on conflict (slug) do update set label = t.label
  returning id;
$$;

create or replace function import_upsert_marker(p_label text) returns uuid
language sql security definer set search_path = public as $$
  insert into markers as t (slug, label) values (import_slugify(p_label), btrim(p_label))
  on conflict (slug) do update set label = t.label
  returning id;
$$;

create or replace function import_upsert_category_route(p_domain text, p_category text) returns uuid
language sql security definer set search_path = public as $$
  insert into category_routes as t (domain, category) values (btrim(p_domain), btrim(p_category))
  on conflict (domain, category) do update set domain = t.domain
  returning id;
$$;

-- Substances -----------------------------------------------------------------

create or replace function admin_import_substances(p_batch_id uuid, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  item jsonb; idx integer := -1;
  v_id uuid; v_slug text; v_classification text; v_risk text;
  v_pair uuid; v_ref text; v_vocab uuid;
  inserted integer := 0; updated integer := 0; skipped integer := 0;
  errors jsonb := '[]'::jsonb; warnings jsonb := '[]'::jsonb;
  existed boolean;
begin
  if auth.uid() is null or not is_site_owner() then raise exception 'site_owner role is required'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'p_rows must be a JSON array'; end if;

  for item in select value from jsonb_array_elements(p_rows) loop
    idx := idx + 1;
    begin
      v_slug := import_slugify(item->>'slug');
      if v_slug = '' then raise exception 'slug is required'; end if;
      if nullif(btrim(item->>'name'), '') is null then raise exception 'name is required'; end if;
      if nullif(btrim(item->>'description'), '') is null then raise exception 'description is required'; end if;
      v_classification := nullif(btrim(item->>'classification'), '');
      if v_classification is null or v_classification not in ('Everyday', 'Clinical', 'Frontier', 'Unknown') then
        raise exception 'invalid classification: %', coalesce(v_classification, '(missing)');
      end if;
      v_risk := nullif(btrim(item->>'risk_level'), '');
      if v_risk is not null and v_risk not in ('Low', 'Moderate', 'High') then
        raise exception 'invalid risk_level: %', v_risk;
      end if;

      select id into v_id from substances where slug = v_slug;
      existed := v_id is not null;

      insert into substances as s (slug, name, classification, description, average_dosage, length_of_cycle,
                                   tolerance_buildup, risk_level, formula, origin, how_obtained, half_life, updated_at)
      values (
        v_slug,
        btrim(item->>'name'),
        v_classification::classification,
        btrim(item->>'description'),
        nullif(btrim(item->>'reported_dose_range'), ''),
        nullif(btrim(item->>'length_of_cycle'), ''),
        nullif(btrim(item->>'tolerance_buildup'), ''),
        v_risk,
        nullif(btrim(item->>'formula'), ''),
        nullif(btrim(item->>'origin'), ''),
        nullif(btrim(item->>'how_obtained'), ''),
        nullif(btrim(item->>'half_life'), ''),
        now()
      )
      on conflict (slug) do update set
        name = excluded.name,
        classification = excluded.classification,
        description = excluded.description,
        average_dosage = coalesce(excluded.average_dosage, s.average_dosage),
        length_of_cycle = coalesce(excluded.length_of_cycle, s.length_of_cycle),
        tolerance_buildup = coalesce(excluded.tolerance_buildup, s.tolerance_buildup),
        risk_level = coalesce(excluded.risk_level, s.risk_level),
        formula = coalesce(excluded.formula, s.formula),
        origin = coalesce(excluded.origin, s.origin),
        how_obtained = coalesce(excluded.how_obtained, s.how_obtained),
        half_life = coalesce(excluded.half_life, s.half_life),
        updated_at = now()
      returning id into v_id;

      if item ? 'aliases' then
        for v_ref in select value #>> '{}' from jsonb_array_elements(item->'aliases') loop
          if btrim(coalesce(v_ref, '')) <> '' then
            insert into substance_aliases (substance_id, alias) values (v_id, btrim(v_ref))
            on conflict do nothing;
          end if;
        end loop;
      end if;

      if item ? 'type_tags' then
        delete from substance_type_tags where substance_id = v_id;
        for v_ref in select value #>> '{}' from jsonb_array_elements(item->'type_tags') loop
          if btrim(coalesce(v_ref, '')) <> '' then
            v_vocab := import_upsert_type_tag(v_ref);
            insert into substance_type_tags (substance_id, type_tag_id) values (v_id, v_vocab) on conflict do nothing;
          end if;
        end loop;
      end if;

      if item ? 'administration' then
        delete from substance_administration_methods where substance_id = v_id;
        for v_ref in select value #>> '{}' from jsonb_array_elements(item->'administration') loop
          if btrim(coalesce(v_ref, '')) <> '' then
            v_vocab := import_upsert_administration_method(v_ref);
            insert into substance_administration_methods (substance_id, administration_method_id) values (v_id, v_vocab) on conflict do nothing;
          end if;
        end loop;
      end if;

      if item ? 'markers' then
        delete from substance_markers where substance_id = v_id;
        for v_ref in select value #>> '{}' from jsonb_array_elements(item->'markers') loop
          if btrim(coalesce(v_ref, '')) <> '' then
            v_vocab := import_upsert_marker(v_ref);
            insert into substance_markers (substance_id, marker_id) values (v_id, v_vocab) on conflict do nothing;
          end if;
        end loop;
      end if;

      if item ? 'routes' then
        delete from substance_routes where substance_id = v_id;
        for item in select value from jsonb_array_elements(item->'routes') loop
          if nullif(btrim(item->>'domain'), '') is not null and nullif(btrim(item->>'category'), '') is not null then
            v_vocab := import_upsert_category_route(item->>'domain', item->>'category');
            insert into substance_routes (substance_id, category_route_id) values (v_id, v_vocab) on conflict do nothing;
          end if;
        end loop;
        -- restore item to the row for the remaining sections
        item := p_rows->idx;
      end if;

      if item ? 'health_risks' then
        delete from substance_effects where substance_id = v_id and kind = 'health_risk';
        insert into substance_effects (substance_id, kind, value)
        select v_id, 'health_risk', btrim(value #>> '{}')
        from jsonb_array_elements(item->'health_risks')
        where btrim(value #>> '{}') <> '';
      end if;

      if item ? 'subjective_effects' then
        delete from substance_effects where substance_id = v_id and kind = 'subjective_effect';
        insert into substance_effects (substance_id, kind, value)
        select v_id, 'subjective_effect', btrim(value #>> '{}')
        from jsonb_array_elements(item->'subjective_effects')
        where btrim(value #>> '{}') <> '';
      end if;

      if item ? 'pairings' then
        delete from substance_pairings where substance_id = v_id;
        for v_ref in select value #>> '{}' from jsonb_array_elements(item->'pairings') loop
          v_pair := import_resolve_substance(v_ref);
          if v_pair is null then
            warnings := warnings || jsonb_build_object('index', idx, 'message', 'unknown pairing substance: ' || v_ref);
          elsif v_pair <> v_id then
            insert into substance_pairings (substance_id, pairs_with_id) values (v_id, v_pair) on conflict do nothing;
          end if;
        end loop;
      end if;

      if existed then updated := updated + 1; else inserted := inserted + 1; end if;
    exception when others then
      skipped := skipped + 1;
      errors := errors || jsonb_build_object('index', idx, 'message', sqlerrm);
    end;
  end loop;

  return jsonb_build_object('inserted', inserted, 'updated', updated, 'skipped', skipped,
                            'errors', errors, 'warnings', warnings, 'batch_id', p_batch_id);
end $$;

-- Link most-popular brands once both substances and brands exist.
create or replace function admin_link_popular_brands(p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare item jsonb; idx integer := -1; v_sub uuid; v_brand uuid; linked integer := 0;
        errors jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not is_site_owner() then raise exception 'site_owner role is required'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'p_rows must be a JSON array'; end if;
  for item in select value from jsonb_array_elements(p_rows) loop
    idx := idx + 1;
    v_sub := import_resolve_substance(item->>'substance_slug');
    select id into v_brand from brands where slug = import_slugify(item->>'brand_slug');
    if v_sub is null or v_brand is null then
      errors := errors || jsonb_build_object('index', idx, 'message', 'unknown substance or brand');
    else
      update substances set most_popular_brand_id = v_brand, updated_at = now() where id = v_sub;
      linked := linked + 1;
    end if;
  end loop;
  return jsonb_build_object('linked', linked, 'errors', errors);
end $$;

-- Brands ---------------------------------------------------------------------

create or replace function admin_import_brands(p_batch_id uuid, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  item jsonb; product jsonb; ing jsonb; idx integer := -1;
  v_id uuid; v_product_id uuid; v_slug text; v_sub uuid; v_ref text;
  inserted integer := 0; updated integer := 0; skipped integer := 0;
  errors jsonb := '[]'::jsonb; warnings jsonb := '[]'::jsonb;
  existed boolean;
begin
  if auth.uid() is null or not is_site_owner() then raise exception 'site_owner role is required'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'p_rows must be a JSON array'; end if;

  for item in select value from jsonb_array_elements(p_rows) loop
    idx := idx + 1;
    begin
      v_slug := import_slugify(item->>'slug');
      if v_slug = '' then raise exception 'slug is required'; end if;
      if nullif(btrim(item->>'name'), '') is null then raise exception 'name is required'; end if;

      select id into v_id from brands where slug = v_slug;
      existed := v_id is not null;

      insert into brands as b (slug, name, description, shipping_reliability, contamination_reports, updated_at)
      values (
        v_slug,
        btrim(item->>'name'),
        nullif(btrim(item->>'description'), ''),
        nullif(btrim(item->>'shipping_reliability'), '')::numeric,
        coalesce(nullif(btrim(item->>'contamination_reports'), '')::integer, 0),
        now()
      )
      on conflict (slug) do update set
        name = excluded.name,
        description = coalesce(excluded.description, b.description),
        shipping_reliability = coalesce(excluded.shipping_reliability, b.shipping_reliability),
        contamination_reports = excluded.contamination_reports,
        updated_at = now()
      returning id into v_id;

      if item ? 'products' then
        for product in select value from jsonb_array_elements(item->'products') loop
          if nullif(btrim(product->>'name'), '') is null then
            warnings := warnings || jsonb_build_object('index', idx, 'message', 'product without a name skipped');
            continue;
          end if;
          v_sub := import_resolve_substance(product->>'substance_slug');
          if nullif(btrim(product->>'substance_slug'), '') is not null and v_sub is null then
            warnings := warnings || jsonb_build_object('index', idx, 'message', 'unknown product substance: ' || (product->>'substance_slug'));
          end if;

          insert into brand_products as bp (brand_id, substance_id, name)
          values (v_id, v_sub, btrim(product->>'name'))
          on conflict (brand_id, name) do update set substance_id = coalesce(excluded.substance_id, bp.substance_id)
          returning id into v_product_id;

          if product ? 'ingredients' then
            delete from brand_ingredients where brand_product_id = v_product_id;
            for ing in select value from jsonb_array_elements(product->'ingredients') loop
              if nullif(btrim(ing->>'name'), '') is not null then
                insert into brand_ingredients (brand_product_id, name, amount)
                values (v_product_id, btrim(ing->>'name'), nullif(btrim(ing->>'amount'), ''));
              end if;
            end loop;
          end if;

          if product ? 'health_labels' then
            delete from brand_health_labels where brand_product_id = v_product_id;
            for v_ref in select value #>> '{}' from jsonb_array_elements(product->'health_labels') loop
              if btrim(coalesce(v_ref, '')) <> '' then
                insert into brand_health_labels (brand_product_id, label) values (v_product_id, btrim(v_ref));
              end if;
            end loop;
          end if;
        end loop;
      end if;

      if existed then updated := updated + 1; else inserted := inserted + 1; end if;
    exception when others then
      skipped := skipped + 1;
      errors := errors || jsonb_build_object('index', idx, 'message', sqlerrm);
    end;
  end loop;

  return jsonb_build_object('inserted', inserted, 'updated', updated, 'skipped', skipped,
                            'errors', errors, 'warnings', warnings, 'batch_id', p_batch_id);
end $$;

-- Stacks ---------------------------------------------------------------------

create or replace function admin_import_stacks(p_batch_id uuid, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  item jsonb; idx integer := -1;
  v_id uuid; v_ref text; v_sub uuid;
  v_component_ids uuid[]; v_component_slugs text[]; v_signature text;
  inserted integer := 0; updated integer := 0; skipped integer := 0;
  errors jsonb := '[]'::jsonb; warnings jsonb := '[]'::jsonb;
  existed boolean;
begin
  if auth.uid() is null or not is_site_owner() then raise exception 'site_owner role is required'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'p_rows must be a JSON array'; end if;

  for item in select value from jsonb_array_elements(p_rows) loop
    idx := idx + 1;
    begin
      if nullif(btrim(item->>'name'), '') is null then raise exception 'name is required'; end if;
      if nullif(btrim(item->>'description'), '') is null then raise exception 'description is required'; end if;
      if jsonb_typeof(item->'components') <> 'array' then raise exception 'components must be an array of substance slugs'; end if;

      v_component_ids := array[]::uuid[];
      v_component_slugs := array[]::text[];
      for v_ref in select value #>> '{}' from jsonb_array_elements(item->'components') loop
        v_sub := import_resolve_substance(v_ref);
        if v_sub is null then raise exception 'unknown component substance: %', v_ref; end if;
        if not (v_sub = any (v_component_ids)) then
          v_component_ids := v_component_ids || v_sub;
          v_component_slugs := v_component_slugs || import_slugify(v_ref);
        end if;
      end loop;
      if array_length(v_component_ids, 1) is null or array_length(v_component_ids, 1) < 2 or array_length(v_component_ids, 1) > 10 then
        raise exception 'stacks need between 2 and 10 distinct components';
      end if;

      select string_agg(s, '+') into v_signature from (select unnest(v_component_slugs) as s order by s) q;

      select id into v_id from stacks where component_signature = v_signature;
      existed := v_id is not null;

      insert into stacks as st (name, description, status, component_signature, updated_at)
      values (btrim(item->>'name'), btrim(item->>'description'), 'approved', v_signature, now())
      on conflict (component_signature) do update set
        name = excluded.name,
        description = excluded.description,
        status = 'approved',
        updated_at = now()
      returning id into v_id;

      insert into stack_components (stack_id, substance_id)
      select v_id, unnest(v_component_ids)
      on conflict do nothing;

      if existed then updated := updated + 1; else inserted := inserted + 1; end if;
    exception when others then
      skipped := skipped + 1;
      errors := errors || jsonb_build_object('index', idx, 'message', sqlerrm);
    end;
  end loop;

  return jsonb_build_object('inserted', inserted, 'updated', updated, 'skipped', skipped,
                            'errors', errors, 'warnings', warnings, 'batch_id', p_batch_id);
end $$;

-- Research sources -------------------------------------------------------------

create or replace function admin_import_sources(p_batch_id uuid, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  item jsonb; idx integer := -1;
  v_id uuid; v_ref text; v_sub uuid;
  v_title text; v_type text; v_url text; v_pmid text; v_doi text; v_year integer; v_year_text text;
  inserted integer := 0; updated integer := 0; skipped integer := 0;
  errors jsonb := '[]'::jsonb; warnings jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not is_site_admin() then raise exception 'site_admin or site_owner role is required'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'p_rows must be a JSON array'; end if;

  for item in select value from jsonb_array_elements(p_rows) loop
    idx := idx + 1;
    begin
      v_title := nullif(btrim(item->>'title'), '');
      if v_title is null then raise exception 'title is required'; end if;
      v_type := nullif(btrim(item->>'source_type'), '');
      if v_type is null or v_type not in ('human_study', 'review_or_meta_analysis', 'animal_study', 'in_vitro_or_mechanistic', 'official_label_or_document', 'brand_or_vendor_document', 'coa_or_testing_document', 'practitioner_source', 'community_or_influencer_mention', 'other') then
        raise exception 'invalid source_type: %', coalesce(v_type, '(missing)');
      end if;
      v_url := nullif(btrim(item->>'url'), '');
      v_pmid := nullif(btrim(item->>'pmid'), '');
      v_doi := nullif(btrim(item->>'doi'), '');
      v_year_text := nullif(btrim(item->>'year'), '');
      if v_year_text is null then
        v_year := null;
      elsif v_year_text ~ '^\d{4}$' then
        v_year := v_year_text::integer;
      else
        raise exception 'invalid year: %', v_year_text;
      end if;

      -- Hierarchical natural-key dedup: pmid, then doi, then url, then title+year.
      select rs.id into v_id
      from research_sources rs
      where (v_pmid is not null and lower(rs.pmid) = lower(v_pmid))
         or (v_doi is not null and lower(rs.doi) = lower(v_doi))
         or (v_url is not null and rs.url = v_url)
         or (v_pmid is null and v_doi is null and v_url is null
             and lower(rs.title) = lower(v_title)
             and coalesce(rs.year, -1) = coalesce(v_year, -1))
      order by rs.created_at asc
      limit 1;

      if v_id is null then
        insert into research_sources (title, authors, year, journal_or_site, url, doi, pmid, source_type,
                                      source_tier, abstract, raw_metadata, match_status, review_status, created_by, updated_at)
        values (v_title, nullif(btrim(item->>'authors'), ''), v_year, nullif(btrim(item->>'journal_or_site'), ''),
                v_url, v_doi, v_pmid, v_type, 'unknown', nullif(btrim(item->>'abstract'), ''), '{}'::jsonb,
                'strong_match', 'unreviewed', auth.uid(), now())
        returning id into v_id;
        inserted := inserted + 1;
      else
        update research_sources set
          title = v_title,
          authors = coalesce(nullif(btrim(item->>'authors'), ''), authors),
          year = coalesce(v_year, year),
          journal_or_site = coalesce(nullif(btrim(item->>'journal_or_site'), ''), journal_or_site),
          url = coalesce(v_url, url),
          doi = coalesce(v_doi, doi),
          pmid = coalesce(v_pmid, pmid),
          source_type = v_type,
          abstract = coalesce(nullif(btrim(item->>'abstract'), ''), abstract),
          updated_at = now()
        where id = v_id;
        updated := updated + 1;
      end if;

      if item ? 'substances' then
        for v_ref in select value #>> '{}' from jsonb_array_elements(item->'substances') loop
          v_sub := import_resolve_substance(v_ref);
          if v_sub is null then
            warnings := warnings || jsonb_build_object('index', idx, 'message', 'unknown substance: ' || v_ref);
          else
            insert into research_source_substances (source_id, substance_id, notes, created_by)
            values (v_id, v_sub, nullif(btrim(item->>'notes'), ''), auth.uid())
            on conflict (source_id, substance_id) do nothing;
          end if;
        end loop;
      end if;
    exception when others then
      skipped := skipped + 1;
      errors := errors || jsonb_build_object('index', idx, 'message', sqlerrm);
    end;
  end loop;

  return jsonb_build_object('inserted', inserted, 'updated', updated, 'skipped', skipped,
                            'errors', errors, 'warnings', warnings, 'batch_id', p_batch_id);
end $$;

-- Research findings ------------------------------------------------------------

create or replace function admin_import_findings(p_batch_id uuid, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  item jsonb; idx integer := -1;
  v_id uuid; v_source uuid; v_sub uuid;
  v_endpoint text; v_direction text; v_summary text; v_study text; v_unit text;
  v_dose numeric; v_dose_text text; v_key text; v_new boolean;
  inserted integer := 0; updated integer := 0; skipped integer := 0;
  errors jsonb := '[]'::jsonb; warnings jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not is_site_owner() then raise exception 'site_owner role is required'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'p_rows must be a JSON array'; end if;

  for item in select value from jsonb_array_elements(p_rows) loop
    idx := idx + 1;
    begin
      v_endpoint := nullif(btrim(item->>'endpoint'), '');
      if v_endpoint is null then raise exception 'endpoint is required'; end if;
      v_summary := nullif(btrim(item->>'finding_summary'), '');
      if v_summary is null then raise exception 'finding_summary is required'; end if;
      v_direction := nullif(btrim(item->>'direction'), '');
      if v_direction is null or v_direction not in ('increased', 'decreased', 'no_clear_change', 'mixed', 'unclear') then
        raise exception 'invalid direction: %', coalesce(v_direction, '(missing)');
      end if;
      v_study := nullif(btrim(item->>'study_type'), '');
      if v_study is not null and v_study not in ('human_rct', 'human_observational', 'review', 'meta_analysis', 'animal', 'in_vitro', 'mechanistic', 'official_document', 'other') then
        raise exception 'invalid study_type: %', v_study;
      end if;
      v_unit := nullif(btrim(item->>'dose_unit'), '');
      if v_unit is not null and v_unit not in ('mcg', 'mg', 'g', 'IU', 'mL', 'cc') then
        raise exception 'invalid dose_unit: %', v_unit;
      end if;
      v_dose_text := nullif(btrim(item->>'dose_amount'), '');
      v_dose := case when v_dose_text is null then null else v_dose_text::numeric end;

      v_sub := import_resolve_substance(item->>'substance_slug');
      if v_sub is null then raise exception 'unknown substance: %', coalesce(item->>'substance_slug', '(missing)'); end if;

      select rs.id into v_source
      from research_sources rs
      where (nullif(btrim(item->>'source_pmid'), '') is not null and lower(rs.pmid) = lower(btrim(item->>'source_pmid')))
         or (nullif(btrim(item->>'source_doi'), '') is not null and lower(rs.doi) = lower(btrim(item->>'source_doi')))
         or (nullif(btrim(item->>'source_url'), '') is not null and rs.url = btrim(item->>'source_url'))
      order by rs.created_at asc
      limit 1;
      if v_source is null then raise exception 'finding does not resolve to a known source (pmid/doi/url)'; end if;

      v_key := v_source::text || '|' || v_sub::text || '|' || lower(v_endpoint) || '|' ||
               coalesce(lower(nullif(btrim(item->>'population'), '')), '') || '|' ||
               coalesce(v_dose::text, '') || coalesce(lower(v_unit), '') || '|' || v_direction;

      insert into research_findings as f (source_id, substance_id, endpoint, direction, finding_summary, population,
                                          dose_amount, dose_unit, frequency, duration, study_type, limitations,
                                          review_status, dedup_key, created_by, updated_at)
      values (v_source, v_sub, v_endpoint, v_direction, v_summary, nullif(btrim(item->>'population'), ''),
              v_dose, v_unit, nullif(btrim(item->>'frequency'), ''), nullif(btrim(item->>'duration'), ''),
              v_study, nullif(btrim(item->>'limitations'), ''), 'pending_review', v_key, auth.uid(), now())
      on conflict (dedup_key) do update set
        finding_summary = excluded.finding_summary,
        frequency = coalesce(excluded.frequency, f.frequency),
        duration = coalesce(excluded.duration, f.duration),
        study_type = coalesce(excluded.study_type, f.study_type),
        limitations = coalesce(excluded.limitations, f.limitations),
        updated_at = now()
      returning id, (xmax = 0) into v_id, v_new;

      -- (xmax = 0) is true for a fresh insert, false for a conflict-update.
      if v_new then inserted := inserted + 1; else updated := updated + 1; end if;
    exception when others then
      skipped := skipped + 1;
      errors := errors || jsonb_build_object('index', idx, 'message', sqlerrm);
    end;
  end loop;

  return jsonb_build_object('inserted', inserted, 'updated', updated, 'skipped', skipped,
                            'errors', errors, 'warnings', warnings, 'batch_id', p_batch_id);
end $$;

-- Lock the RPC surface: only signed-in users may execute, and each function
-- re-checks the stored role in its body.
do $$
declare f text;
begin
  foreach f in array array[
    'admin_create_import_batch(jsonb)',
    'admin_finalize_import_batch(uuid, jsonb)',
    'admin_import_substances(uuid, jsonb)',
    'admin_link_popular_brands(jsonb)',
    'admin_import_brands(uuid, jsonb)',
    'admin_import_stacks(uuid, jsonb)',
    'admin_import_sources(uuid, jsonb)',
    'admin_import_findings(uuid, jsonb)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
  foreach f in array array[
    'import_slugify(text)',
    'import_resolve_substance(text)',
    'import_upsert_type_tag(text)',
    'import_upsert_administration_method(text)',
    'import_upsert_marker(text)',
    'import_upsert_category_route(text, text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 6. PostgREST schema reload (missing from every earlier migration; its
--    absence is one reason applied DDL looked broken in production).
-- ---------------------------------------------------------------------------
notify pgrst, 'reload schema';
