-- Research sources can now be linked to brands and stacks, not only
-- substances — so brand-level research (COAs, vendor documents, testing
-- reports imported from brands.json / evidence.json) lands on the brand it
-- belongs to instead of importing orphaned, and stack research has a home
-- too. Mirrors research_source_substances: link tables written only by the
-- SECURITY DEFINER import RPC, site-admin read, additive public read of the
-- links and their linked sources.

-- 1) Link tables ------------------------------------------------------------

create table if not exists research_source_brands (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references research_sources (id) on delete cascade,
  brand_id uuid not null references brands (id) on delete cascade,
  notes text,
  created_by uuid references users (id) on delete set null,
  import_batch_id uuid references research_import_batches (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (source_id, brand_id)
);

create table if not exists research_source_stacks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references research_sources (id) on delete cascade,
  stack_id uuid not null references stacks (id) on delete cascade,
  notes text,
  created_by uuid references users (id) on delete set null,
  import_batch_id uuid references research_import_batches (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (source_id, stack_id)
);

create index if not exists research_source_brands_brand_idx on research_source_brands (brand_id);
create index if not exists research_source_stacks_stack_idx on research_source_stacks (stack_id);

alter table research_source_brands enable row level security;
alter table research_source_stacks enable row level security;

drop policy if exists research_source_brands_site_admin_read on research_source_brands;
create policy research_source_brands_site_admin_read on research_source_brands
  for select using (is_site_admin());
drop policy if exists research_source_brands_public_read on research_source_brands;
create policy research_source_brands_public_read on research_source_brands
  for select using (true);

drop policy if exists research_source_stacks_site_admin_read on research_source_stacks;
create policy research_source_stacks_site_admin_read on research_source_stacks
  for select using (is_site_admin());
drop policy if exists research_source_stacks_public_read on research_source_stacks;
create policy research_source_stacks_public_read on research_source_stacks
  for select using (true);

grant select on research_source_brands to anon, authenticated;
grant select on research_source_stacks to anon, authenticated;

-- A source linked to a brand or stack is public the same way a
-- substance-linked one already is (20260721030000_public_substance_sources).
drop policy if exists research_sources_public_read_linked on research_sources;
create policy research_sources_public_read_linked on research_sources
  for select using (
    exists (select 1 from research_source_substances rss where rss.source_id = research_sources.id)
    or exists (select 1 from research_source_brands rsb where rsb.source_id = research_sources.id)
    or exists (select 1 from research_source_stacks rst where rst.source_id = research_sources.id)
  );

-- 2) Resolvers --------------------------------------------------------------

create or replace function import_resolve_brand(p_ref text)
returns uuid language plpgsql stable security definer set search_path = public as $$
declare v_id uuid; v text := lower(btrim(coalesce(p_ref, '')));
begin
  if v = '' then return null; end if;
  select id into v_id from brands where lower(slug) = v;
  if v_id is null then
    select id into v_id from brands where lower(name) = v order by created_at asc limit 1;
  end if;
  return v_id;
end $$;

create or replace function import_resolve_stack(p_ref text)
returns uuid language plpgsql stable security definer set search_path = public as $$
declare v_id uuid; v text := lower(btrim(coalesce(p_ref, '')));
begin
  if v = '' then return null; end if;
  select id into v_id from stacks where lower(name) = v order by created_at asc limit 1;
  return v_id;
end $$;

revoke all on function import_resolve_brand(text) from public, anon, authenticated;
revoke all on function import_resolve_stack(text) from public, anon, authenticated;

-- 3) admin_import_sources: also link brands[] and stacks[] ------------------
-- Body matches 20260713051500_source_document_provenance.sql plus the two new
-- link loops; unknown refs surface as row warnings, same as substances.

create or replace function admin_import_sources(p_batch_id uuid, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  item jsonb; idx integer := -1;
  v_id uuid; v_ref text; v_sub uuid; v_brand uuid; v_stack uuid; v_link_id uuid;
  v_title text; v_type text; v_url text; v_pmid text; v_doi text; v_year integer; v_year_text text;
  v_hash text;
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
      v_hash := nullif(btrim(item->>'content_hash'), '');
      v_year_text := nullif(btrim(item->>'year'), '');
      if v_year_text is null then
        v_year := null;
      elsif v_year_text ~ '^\d{4}$' then
        v_year := v_year_text::integer;
      else
        raise exception 'invalid year: %', v_year_text;
      end if;

      -- Hierarchical natural-key dedup: pmid, then doi, then url, then
      -- content hash (documents with no other identity), then title+year.
      select rs.id into v_id
      from research_sources rs
      where (v_pmid is not null and lower(rs.pmid) = lower(v_pmid))
         or (v_doi is not null and lower(rs.doi) = lower(v_doi))
         or (v_url is not null and rs.url = v_url)
         or (v_pmid is null and v_doi is null and v_url is null
             and v_hash is not null and rs.content_hash = v_hash)
         or (v_pmid is null and v_doi is null and v_url is null and v_hash is null
             and lower(rs.title) = lower(v_title)
             and coalesce(rs.year, -1) = coalesce(v_year, -1))
      order by rs.created_at asc
      limit 1;

      if v_id is null then
        insert into research_sources (title, authors, year, journal_or_site, url, doi, pmid, source_type,
                                      source_tier, abstract, raw_metadata, match_status, review_status,
                                      raw_content, content_hash, original_filename, file_type, import_relative_path,
                                      created_by, import_batch_id, updated_at)
        values (v_title, nullif(btrim(item->>'authors'), ''), v_year, nullif(btrim(item->>'journal_or_site'), ''),
                v_url, v_doi, v_pmid, v_type, 'unknown', nullif(btrim(item->>'abstract'), ''), '{}'::jsonb,
                'strong_match', 'unreviewed',
                nullif(item->>'raw_content', ''), v_hash, nullif(btrim(item->>'original_filename'), ''),
                nullif(btrim(item->>'file_type'), ''), nullif(btrim(item->>'import_relative_path'), ''),
                auth.uid(), p_batch_id, now())
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
          raw_content = coalesce(nullif(item->>'raw_content', ''), raw_content),
          content_hash = coalesce(v_hash, content_hash),
          original_filename = coalesce(nullif(btrim(item->>'original_filename'), ''), original_filename),
          file_type = coalesce(nullif(btrim(item->>'file_type'), ''), file_type),
          import_relative_path = coalesce(nullif(btrim(item->>'import_relative_path'), ''), import_relative_path),
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
            insert into research_source_substances (source_id, substance_id, notes, created_by, import_batch_id)
            values (v_id, v_sub, nullif(btrim(item->>'notes'), ''), auth.uid(), p_batch_id)
            on conflict (source_id, substance_id) do nothing
            returning id into v_link_id;
          end if;
        end loop;
      end if;

      if item ? 'brands' then
        for v_ref in select value #>> '{}' from jsonb_array_elements(item->'brands') loop
          v_brand := import_resolve_brand(v_ref);
          if v_brand is null then
            warnings := warnings || jsonb_build_object('index', idx, 'message', 'unknown brand: ' || v_ref);
          else
            insert into research_source_brands (source_id, brand_id, notes, created_by, import_batch_id)
            values (v_id, v_brand, nullif(btrim(item->>'notes'), ''), auth.uid(), p_batch_id)
            on conflict (source_id, brand_id) do nothing
            returning id into v_link_id;
          end if;
        end loop;
      end if;

      if item ? 'stacks' then
        for v_ref in select value #>> '{}' from jsonb_array_elements(item->'stacks') loop
          v_stack := import_resolve_stack(v_ref);
          if v_stack is null then
            warnings := warnings || jsonb_build_object('index', idx, 'message', 'unknown stack: ' || v_ref);
          else
            insert into research_source_stacks (source_id, stack_id, notes, created_by, import_batch_id)
            values (v_id, v_stack, nullif(btrim(item->>'notes'), ''), auth.uid(), p_batch_id)
            on conflict (source_id, stack_id) do nothing
            returning id into v_link_id;
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

-- 4) Batch revert also removes the new links --------------------------------

create or replace function admin_revert_import_batch(p_batch_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_findings integer; v_links integer; v_brand_links integer; v_stack_links integer; v_sources integer; v_label text;
begin
  if auth.uid() is null or not is_site_owner() then raise exception 'site_owner role is required'; end if;

  select label into v_label from research_import_batches where id = p_batch_id;
  if not found then raise exception 'unknown batch'; end if;

  delete from research_findings where import_batch_id = p_batch_id;
  get diagnostics v_findings = row_count;

  delete from research_source_substances where import_batch_id = p_batch_id;
  get diagnostics v_links = row_count;

  delete from research_source_brands where import_batch_id = p_batch_id;
  get diagnostics v_brand_links = row_count;

  delete from research_source_stacks where import_batch_id = p_batch_id;
  get diagnostics v_stack_links = row_count;

  -- Sources created by this batch cascade-delete any remaining links and
  -- findings that later batches attached to them stay only if those rows
  -- belong to other batches and reference other sources; direct children
  -- cascade by FK.
  delete from research_sources where import_batch_id = p_batch_id;
  get diagnostics v_sources = row_count;

  update research_import_batches
  set notes = coalesce(notes || ' · ', '') || 'reverted'
  where id = p_batch_id;

  insert into moderation_log (admin_user_id, action_type, target_type, target_id, note)
  values (auth.uid(), 'import_batch_reverted', 'import_batch', p_batch_id,
          format('%s: removed %s findings, %s links, %s sources',
                 coalesce(v_label, 'unlabeled batch'),
                 v_findings, v_links + v_brand_links + v_stack_links, v_sources));

  return jsonb_build_object('batch_id', p_batch_id, 'findings_removed', v_findings,
                            'links_removed', v_links + v_brand_links + v_stack_links,
                            'sources_removed', v_sources);
end $$;

notify pgrst, 'reload schema';
