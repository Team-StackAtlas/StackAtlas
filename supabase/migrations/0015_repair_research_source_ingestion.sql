-- PR 48: repair research source ingestion persistence and stored-role authorization.

create or replace function is_site_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p where p.id = auth.uid() and p.site_role in ('site_admin', 'site_owner'));
$$;

create or replace function is_site_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p where p.id = auth.uid() and p.site_role = 'site_owner');
$$;

alter table research_source_substances enable row level security;
alter table research_import_batches enable row level security;

drop policy if exists research_sources_site_admin_all on research_sources;
create policy research_sources_site_admin_read on research_sources for select using (is_site_admin());

drop policy if exists research_source_substances_site_admin_all on research_source_substances;
drop policy if exists research_source_substances_site_admin_read on research_source_substances;
create policy research_source_substances_site_admin_read on research_source_substances for select using (is_site_admin());

drop policy if exists research_import_batches_site_owner_all on research_import_batches;
drop policy if exists research_import_batches_site_owner_read on research_import_batches;
create policy research_import_batches_site_owner_read on research_import_batches for select using (is_site_owner());

grant select on substances to authenticated;
grant select on research_sources, research_source_substances, research_import_batches to authenticated;

create unique index if not exists research_source_substances_source_substance_unique on research_source_substances (source_id, substance_id);

create or replace function normalize_research_source_row(p_row jsonb)
returns table (
  substance_id uuid, title text, source_type text, url text, pmid text, doi text, year integer,
  journal_or_site text, authors text, abstract text, notes text
) language plpgsql stable security definer set search_path = public as $$
declare year_text text;
begin
  substance_id := nullif(btrim(p_row->>'substance_id'), '')::uuid;
  title := nullif(btrim(p_row->>'title'), '');
  source_type := nullif(btrim(p_row->>'source_type'), '');
  url := nullif(btrim(p_row->>'url'), '');
  pmid := nullif(btrim(p_row->>'pmid'), '');
  doi := nullif(btrim(p_row->>'doi'), '');
  year_text := nullif(btrim(p_row->>'year'), '');
  journal_or_site := nullif(btrim(p_row->>'journal_or_site'), '');
  authors := nullif(btrim(p_row->>'authors'), '');
  abstract := nullif(btrim(p_row->>'abstract'), '');
  notes := nullif(btrim(p_row->>'notes'), '');
  if substance_id is null then raise exception 'substance_id is required'; end if;
  if title is null then raise exception 'title is required'; end if;
  if source_type is null or source_type not in ('human_study','review_or_meta_analysis','animal_study','in_vitro_or_mechanistic','official_label_or_document','brand_or_vendor_document','coa_or_testing_document','practitioner_source','community_or_influencer_mention','other') then raise exception 'invalid source_type: %', coalesce(source_type, ''); end if;
  if year_text is null then year := null; elsif year_text ~ '^\d{4}$' then year := year_text::integer; else raise exception 'invalid year: %', year_text; end if;
  if not exists (select 1 from substances s where s.id = substance_id) then raise exception 'unknown substance_id: %', substance_id; end if;
  return next;
end $$;

create or replace function upsert_research_source_from_row(p_row jsonb)
returns table (source_id uuid, source_created boolean, link_created boolean)
language plpgsql security definer set search_path = public as $$
declare r record; inserted_id uuid; inserted_link_id uuid;
begin
  select * into r from normalize_research_source_row(p_row);
  select rs.id into source_id
  from research_sources rs
  where (r.pmid is not null and lower(rs.pmid) = lower(r.pmid))
     or (r.doi is not null and lower(rs.doi) = lower(r.doi))
     or (r.url is not null and rs.url = r.url)
  order by rs.created_at asc limit 1;
  if source_id is null then
    insert into research_sources (substance_id,title,authors,year,journal_or_site,url,doi,pmid,source_type,source_tier,abstract,match_status,review_status,created_by,updated_at)
    values (r.substance_id,r.title,r.authors,r.year,r.journal_or_site,r.url,r.doi,r.pmid,r.source_type,'unknown',r.abstract,'strong_match','unreviewed',auth.uid(),now())
    returning id into inserted_id;
    source_id := inserted_id; source_created := true;
  else
    source_created := false;
  end if;
  insert into research_source_substances (source_id, substance_id, notes, created_by)
  values (source_id, r.substance_id, r.notes, auth.uid())
  on conflict (source_id, substance_id) do nothing
  returning id into inserted_link_id;
  link_created := inserted_link_id is not null;
  return next;
end $$;

create or replace function owner_bulk_import_research_sources(p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare item jsonb; result record; batch_id uuid; total int; imported int := 0; reused int := 0; linked int := 0;
begin
  if auth.uid() is null or not is_site_owner() then raise exception 'site_owner role is required'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'p_rows must be a JSON array'; end if;
  total := jsonb_array_length(p_rows);
  insert into research_import_batches (imported_by,row_count,imported_count,skipped_count,error_count)
  values (auth.uid(), total, 0, 0, 0) returning id into batch_id;
  for item in select value from jsonb_array_elements(p_rows) loop
    select * into result from upsert_research_source_from_row(item);
    if result.source_created then imported := imported + 1; else reused := reused + 1; end if;
    if result.link_created then linked := linked + 1; end if;
  end loop;
  update research_import_batches set imported_count = imported, skipped_count = 0, error_count = 0 where id = batch_id;
  return jsonb_build_object('batch_id', batch_id, 'row_count', total, 'imported_count', imported, 'reused_count', reused, 'linked_count', linked, 'skipped_count', 0);
end $$;

create or replace function admin_add_research_source(p_row jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare result record;
begin
  if auth.uid() is null or not is_site_admin() then raise exception 'site_admin or site_owner role is required'; end if;
  select * into result from upsert_research_source_from_row(p_row);
  return jsonb_build_object('source_id', result.source_id, 'source_created', result.source_created, 'link_created', result.link_created);
end $$;

revoke all on function normalize_research_source_row(jsonb) from public, anon, authenticated;
revoke all on function upsert_research_source_from_row(jsonb) from public, anon, authenticated;
revoke all on function owner_bulk_import_research_sources(jsonb) from public, anon, authenticated;
revoke all on function admin_add_research_source(jsonb) from public, anon, authenticated;
grant execute on function owner_bulk_import_research_sources(jsonb) to authenticated;
grant execute on function admin_add_research_source(jsonb) to authenticated;
