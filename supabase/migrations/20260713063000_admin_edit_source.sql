-- Admin edit for imported research source bibliographic metadata.
--
-- Sources are usually created by the pack importers (admin_import_sources)
-- and their natural-key resolution can pick a slightly wrong record, or the
-- source pack itself can have a typo. This lets a site admin correct the
-- bibliographic fields afterward without re-importing. Only whitelisted
-- fields are editable; document_text/content_hash/import_batch_id/
-- match_status and the created_* audit trail are never touched here.

create or replace function admin_edit_source(p_source_id uuid, p_patch jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_exists uuid;
  v_title text; v_url text; v_pmid text; v_doi text; v_journal text; v_authors text; v_abstract text; v_type text;
  v_year_text text; v_year integer;
  v_changed text[];
  v_row jsonb;
begin
  if auth.uid() is null or not is_site_admin() then raise exception 'not authorized'; end if;
  if jsonb_typeof(p_patch) <> 'object' then raise exception 'p_patch must be a JSON object'; end if;

  select id into v_exists from research_sources where id = p_source_id for update;
  if v_exists is null then raise exception 'unknown source: %', p_source_id; end if;

  v_changed := array(
    select k from unnest(array['title', 'url', 'pmid', 'doi', 'year', 'journal_or_site', 'authors', 'abstract', 'source_type']) as k
    where p_patch ? k
  );
  if array_length(v_changed, 1) is null then raise exception 'no editable fields provided in patch'; end if;

  if p_patch ? 'title' then
    v_title := nullif(btrim(p_patch->>'title'), '');
    if v_title is null then raise exception 'title cannot be empty'; end if;
  end if;

  if p_patch ? 'url' then v_url := nullif(btrim(p_patch->>'url'), ''); end if;
  if p_patch ? 'pmid' then v_pmid := nullif(btrim(p_patch->>'pmid'), ''); end if;
  if p_patch ? 'doi' then v_doi := nullif(btrim(p_patch->>'doi'), ''); end if;
  if p_patch ? 'journal_or_site' then v_journal := nullif(btrim(p_patch->>'journal_or_site'), ''); end if;
  if p_patch ? 'authors' then v_authors := nullif(btrim(p_patch->>'authors'), ''); end if;
  if p_patch ? 'abstract' then v_abstract := nullif(btrim(p_patch->>'abstract'), ''); end if;

  if p_patch ? 'year' then
    v_year_text := nullif(btrim(p_patch->>'year'), '');
    if v_year_text is null then
      v_year := null;
    elsif v_year_text ~ '^\d{4}$' then
      v_year := v_year_text::integer;
    else
      raise exception 'invalid year: %', v_year_text;
    end if;
  end if;

  if p_patch ? 'source_type' then
    v_type := nullif(btrim(p_patch->>'source_type'), '');
    if v_type is null or v_type not in ('human_study', 'review_or_meta_analysis', 'animal_study', 'in_vitro_or_mechanistic', 'official_label_or_document', 'brand_or_vendor_document', 'coa_or_testing_document', 'practitioner_source', 'community_or_influencer_mention', 'other') then
      raise exception 'invalid source_type: %', coalesce(v_type, '(missing)');
    end if;
  end if;

  if p_patch ? 'pmid' and v_pmid is not null
     and exists (select 1 from research_sources where id <> p_source_id and lower(pmid) = lower(v_pmid)) then
    raise exception 'another source already has this pmid';
  end if;
  if p_patch ? 'doi' and v_doi is not null
     and exists (select 1 from research_sources where id <> p_source_id and lower(doi) = lower(v_doi)) then
    raise exception 'another source already has this doi';
  end if;
  if p_patch ? 'url' and v_url is not null
     and exists (select 1 from research_sources where id <> p_source_id and url = v_url) then
    raise exception 'another source already has this url';
  end if;

  update research_sources set
    title = case when p_patch ? 'title' then v_title else title end,
    url = case when p_patch ? 'url' then v_url else url end,
    pmid = case when p_patch ? 'pmid' then v_pmid else pmid end,
    doi = case when p_patch ? 'doi' then v_doi else doi end,
    year = case when p_patch ? 'year' then v_year else year end,
    journal_or_site = case when p_patch ? 'journal_or_site' then v_journal else journal_or_site end,
    authors = case when p_patch ? 'authors' then v_authors else authors end,
    abstract = case when p_patch ? 'abstract' then v_abstract else abstract end,
    source_type = case when p_patch ? 'source_type' then v_type else source_type end,
    updated_at = now()
  where id = p_source_id;

  insert into moderation_log (admin_user_id, action_type, target_type, target_id, note)
  values (auth.uid(), 'edit_source', 'research_source', p_source_id,
          'changed: ' || array_to_string(v_changed, ', '));

  select to_jsonb(rs.*) into v_row from research_sources rs where rs.id = p_source_id;
  return v_row;
end $$;

revoke all on function admin_edit_source(uuid, jsonb) from public, anon, authenticated;
grant execute on function admin_edit_source(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
