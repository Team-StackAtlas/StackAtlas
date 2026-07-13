-- Import batch undo for research entities.
--
-- Rows created (not merely updated) by an import batch are stamped with the
-- batch id, so a bad generation run can be reverted precisely: its findings,
-- source links, and newly created sources are removed; pre-existing sources
-- that the batch merely updated or linked are left in place minus the links
-- it added. Catalog entities (substances/brands/stacks) are deliberately not
-- revertable this way — they can be referenced by community content, so they
-- are corrected by re-import instead.

alter table research_sources add column if not exists import_batch_id uuid references research_import_batches (id) on delete set null;
alter table research_source_substances add column if not exists import_batch_id uuid references research_import_batches (id) on delete set null;
alter table research_findings add column if not exists import_batch_id uuid references research_import_batches (id) on delete set null;

-- Re-create the source importer with batch stamping on inserts.
create or replace function admin_import_sources(p_batch_id uuid, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  item jsonb; idx integer := -1;
  v_id uuid; v_ref text; v_sub uuid; v_link_id uuid;
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
                                      source_tier, abstract, raw_metadata, match_status, review_status,
                                      created_by, import_batch_id, updated_at)
        values (v_title, nullif(btrim(item->>'authors'), ''), v_year, nullif(btrim(item->>'journal_or_site'), ''),
                v_url, v_doi, v_pmid, v_type, 'unknown', nullif(btrim(item->>'abstract'), ''), '{}'::jsonb,
                'strong_match', 'unreviewed', auth.uid(), p_batch_id, now())
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
            insert into research_source_substances (source_id, substance_id, notes, created_by, import_batch_id)
            values (v_id, v_sub, nullif(btrim(item->>'notes'), ''), auth.uid(), p_batch_id)
            on conflict (source_id, substance_id) do nothing
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

-- Re-create the findings importer with batch stamping on inserts.
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
                                          review_status, dedup_key, created_by, import_batch_id, updated_at)
      values (v_source, v_sub, v_endpoint, v_direction, v_summary, nullif(btrim(item->>'population'), ''),
              v_dose, v_unit, nullif(btrim(item->>'frequency'), ''), nullif(btrim(item->>'duration'), ''),
              v_study, nullif(btrim(item->>'limitations'), ''), 'pending_review', v_key, auth.uid(), p_batch_id, now())
      on conflict (dedup_key) do update set
        finding_summary = excluded.finding_summary,
        frequency = coalesce(excluded.frequency, f.frequency),
        duration = coalesce(excluded.duration, f.duration),
        study_type = coalesce(excluded.study_type, f.study_type),
        limitations = coalesce(excluded.limitations, f.limitations),
        updated_at = now()
      returning id, (xmax = 0) into v_id, v_new;

      if v_new then inserted := inserted + 1; else updated := updated + 1; end if;
    exception when others then
      skipped := skipped + 1;
      errors := errors || jsonb_build_object('index', idx, 'message', sqlerrm);
    end;
  end loop;

  return jsonb_build_object('inserted', inserted, 'updated', updated, 'skipped', skipped,
                            'errors', errors, 'warnings', warnings, 'batch_id', p_batch_id);
end $$;

-- Revert everything a batch created (owner-only, audit-logged).
create or replace function admin_revert_import_batch(p_batch_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_findings integer; v_links integer; v_sources integer; v_label text;
begin
  if auth.uid() is null or not is_site_owner() then raise exception 'site_owner role is required'; end if;

  select label into v_label from research_import_batches where id = p_batch_id;
  if not found then raise exception 'unknown batch'; end if;

  delete from research_findings where import_batch_id = p_batch_id;
  get diagnostics v_findings = row_count;

  delete from research_source_substances where import_batch_id = p_batch_id;
  get diagnostics v_links = row_count;

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
                 coalesce(v_label, 'unlabeled batch'), v_findings, v_links, v_sources));

  return jsonb_build_object('batch_id', p_batch_id, 'findings_removed', v_findings,
                            'links_removed', v_links, 'sources_removed', v_sources);
end $$;

revoke all on function admin_revert_import_batch(uuid) from public, anon, authenticated;
grant execute on function admin_revert_import_batch(uuid) to authenticated;

notify pgrst, 'reload schema';
