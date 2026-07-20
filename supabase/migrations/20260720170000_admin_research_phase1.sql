-- Admin research workflow — Phase 1 foundation.
--
-- Additive only. Adds the pieces the existing schema lacks for the entity-first
-- research/provenance workflow: raw-document storage, a product variant/batch/
-- test-result chain, and an immutable audit log. Existing tables (brands,
-- brand_products, research_sources, research_findings, research_source_substances,
-- research_import_batches) are reused, not duplicated.
--
-- Production force-enables RLS on every new table via an event trigger, so each
-- table below gets explicit policies + grants or it is deny-all. Writes to
-- everything here are admin-gated; public read is limited to approved rows.

-- ---------------------------------------------------------------------------
-- 1. Raw document storage (labels, COAs, lab reports, product images)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'research-docs', 'research-docs', false, 10485760,
  array['application/pdf','image/png','image/jpeg','image/webp','image/gif','text/plain','text/markdown']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists research_docs_admin_read on storage.objects;
create policy research_docs_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'research-docs' and is_site_admin());

drop policy if exists research_docs_admin_insert on storage.objects;
create policy research_docs_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'research-docs' and is_site_admin());

drop policy if exists research_docs_admin_delete on storage.objects;
create policy research_docs_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'research-docs' and is_site_admin());

-- Point a research_source at its stored binary document (nullable; URL-only
-- sources leave these empty).
alter table research_sources add column if not exists storage_bucket text;
alter table research_sources add column if not exists storage_path text;

-- ---------------------------------------------------------------------------
-- 2. Product variant / batch / test-result chain (extends brand_products)
-- ---------------------------------------------------------------------------

create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  brand_product_id uuid not null references brand_products (id) on delete cascade,
  variant_name text,
  form text,
  size text,
  strength text,
  country_formula text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists product_variants_brand_product_id_idx on product_variants (brand_product_id);

create table if not exists product_batches (
  id uuid primary key default gen_random_uuid(),
  brand_product_id uuid not null references brand_products (id) on delete cascade,
  variant_id uuid references product_variants (id) on delete set null,
  lot_number text,
  manufacture_date date,
  expiry_date date,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists product_batches_brand_product_id_idx on product_batches (brand_product_id);
create index if not exists product_batches_variant_id_idx on product_batches (variant_id);

-- A single measured lab result, scoped to the most specific entity it applies
-- to (batch > variant > product > substance). Sourced from a research_source
-- (the uploaded document). review_status gates public visibility.
create table if not exists test_results (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references research_sources (id) on delete cascade,
  substance_id uuid references substances (id) on delete set null,
  brand_product_id uuid references brand_products (id) on delete set null,
  variant_id uuid references product_variants (id) on delete set null,
  batch_id uuid references product_batches (id) on delete set null,
  category text,
  analyte text not null,
  result_value text,
  result_unit text,
  specification text,
  pass_fail text check (pass_fail is null or pass_fail in ('pass','fail','not_stated')),
  source_page int,
  source_excerpt text,
  confidence text check (confidence is null or confidence in ('low','moderate','high')),
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected')),
  created_by uuid references users (id) default auth.uid(),
  reviewed_by uuid references users (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists test_results_source_id_idx on test_results (source_id);
create index if not exists test_results_substance_id_idx on test_results (substance_id);
create index if not exists test_results_brand_product_id_idx on test_results (brand_product_id);
create index if not exists test_results_variant_id_idx on test_results (variant_id);
create index if not exists test_results_batch_id_idx on test_results (batch_id);

-- RLS: variants/batches are catalog data (public read); test_results are public
-- only once approved. All writes are admin-gated.
alter table product_variants enable row level security;
alter table product_batches enable row level security;
alter table test_results enable row level security;

drop policy if exists product_variants_public_read on product_variants;
create policy product_variants_public_read on product_variants for select using (true);
drop policy if exists product_variants_admin_write on product_variants;
create policy product_variants_admin_write on product_variants for all
  using (is_site_admin()) with check (is_site_admin());

drop policy if exists product_batches_public_read on product_batches;
create policy product_batches_public_read on product_batches for select using (true);
drop policy if exists product_batches_admin_write on product_batches;
create policy product_batches_admin_write on product_batches for all
  using (is_site_admin()) with check (is_site_admin());

drop policy if exists test_results_public_read on test_results;
create policy test_results_public_read on test_results for select
  using (review_status = 'approved' or is_site_admin());
drop policy if exists test_results_admin_write on test_results;
create policy test_results_admin_write on test_results for all
  using (is_site_admin()) with check (is_site_admin());

grant select on product_variants, product_batches, test_results to anon, authenticated;
grant insert, update, delete on product_variants, product_batches, test_results to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Immutable audit log
-- ---------------------------------------------------------------------------

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references users (id) default auth.uid(),
  actor_role_snapshot text,
  action_type text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_events_entity_idx on audit_events (entity_type, entity_id);
create index if not exists audit_events_actor_user_id_idx on audit_events (actor_user_id);
create index if not exists audit_events_created_at_idx on audit_events (created_at desc);

alter table audit_events enable row level security;
-- Admins read; there is NO insert/update/delete policy, so the table is
-- append-only through the SECURITY DEFINER writer below and immutable to
-- everyone else.
drop policy if exists audit_events_admin_read on audit_events;
create policy audit_events_admin_read on audit_events for select to authenticated
  using (is_site_admin());
grant select on audit_events to authenticated;

create or replace function log_audit_event(
  p_action_type text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
  v_role text;
  v_id uuid;
begin
  if v_actor is null or not is_site_admin() then
    raise exception 'site_admin or site_owner role is required';
  end if;
  select site_role into v_role from profiles where id = v_actor;
  insert into audit_events (actor_user_id, actor_role_snapshot, action_type, entity_type, entity_id, metadata)
  values (v_actor, v_role, p_action_type, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end $$;

revoke all on function log_audit_event(text, text, uuid, jsonb) from public, anon, authenticated;
grant execute on function log_audit_event(text, text, uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
