-- Provenance columns for sources imported from raw documents (Markdown, or
-- any future non-structured format) rather than hand-authored pack rows:
-- the original text, a content hash for idempotent re-import when no
-- pmid/doi/url identity exists, and where the file came from. Re-creates
-- admin_import_sources to persist these and to add content_hash as an
-- additional dedup identity (checked after pmid/doi/url, before the
-- title+year fallback — a document with no other identity dedupes on its
-- exact text).

alter table research_sources add column if not exists raw_content text;
alter table research_sources add column if not exists content_hash text;
alter table research_sources add column if not exists original_filename text;
alter table research_sources add column if not exists file_type text;
alter table research_sources add column if not exists import_relative_path text;

create index if not exists research_sources_content_hash_idx on research_sources (content_hash) where content_hash is not null;

create or replace function admin_import_sources(p_batch_id uuid, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  item jsonb; idx integer := -1;
  v_id uuid; v_ref text; v_sub uuid; v_link_id uuid;
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
    exception when others then
      skipped := skipped + 1;
      errors := errors || jsonb_build_object('index', idx, 'message', sqlerrm);
    end;
  end loop;

  return jsonb_build_object('inserted', inserted, 'updated', updated, 'skipped', skipped,
                            'errors', errors, 'warnings', warnings, 'batch_id', p_batch_id);
end $$;

notify pgrst, 'reload schema';
