-- Research connector: submissions, review, publication, rollback.
--
-- Regular Claude submits structured research through the `research-mcp`
-- Edge Function, authenticated as the site owner via Supabase Auth OAuth.
-- The function validates, stages sources/findings through the existing
-- import RPCs (which already land as unreviewed / pending_review), and
-- records the whole batch here. Description and glossary proposals are
-- never applied on submit; they wait in `payload` until an admin approves
-- the submission, at which point the RPCs below publish them with history
-- so every change can be reverted.
--
-- Policy (v1, deliberately conservative):
--   * Nothing a submission proposes is public until an admin approves it.
--   * Approval publishes: description/origin/half-life updates (with the
--     previous values saved), glossary terms (previous rows saved), and
--     flips this batch's findings to `approved`. Sources stay bibliographic
--     records; their review_status is untouched.
--   * Rejection removes the staged batch (existing revert RPC) and keeps the
--     submission row and report as the audit trail.
--   * Revert of a published submission restores descriptions and glossary
--     rows from history and removes the batch's sources/findings.

create table if not exists research_submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references users (id) on delete set null,
  client_name text,
  idempotency_key text not null,
  label text not null,
  is_test boolean not null default false,
  status text not null default 'needs_review'
    check (status in ('needs_review', 'rejected', 'published', 'reverted')),
  payload jsonb not null,
  report jsonb not null default '{}'::jsonb,
  import_batch_id uuid references research_import_batches (id) on delete set null,
  substance_slugs text[] not null default '{}',
  reviewed_by uuid references users (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  /** Snapshot taken at publish time so a revert can restore exactly what was there. */
  undo jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists research_submissions_idem on research_submissions (submitted_by, idempotency_key);
create index if not exists research_submissions_status_idx on research_submissions (status, created_at desc);

alter table research_submissions enable row level security;
drop policy if exists research_submissions_admin_read on research_submissions;
create policy research_submissions_admin_read on research_submissions for select using (is_site_admin());
grant select on research_submissions to authenticated;

create table if not exists substance_description_history (
  id uuid primary key default gen_random_uuid(),
  substance_id uuid not null references substances (id) on delete cascade,
  submission_id uuid references research_submissions (id) on delete set null,
  previous jsonb not null,
  next jsonb not null,
  changed_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table substance_description_history enable row level security;
drop policy if exists substance_description_history_admin_read on substance_description_history;
create policy substance_description_history_admin_read on substance_description_history for select using (is_site_admin());
grant select on substance_description_history to authenticated;

-- ---------------------------------------------------------------------------
-- Queue: what needs research, by defensible rules on existing fields.
-- ---------------------------------------------------------------------------
create or replace function research_queue(p_limit integer default 20, p_classification text default null)
returns table (
  slug text, name text, classification text, risk_level text,
  description_length integer, description_circular boolean,
  source_count integer, finding_count integer, routes text[],
  reasons text[], score integer
)
language sql stable security definer set search_path = public as $$
  with base as (
    select s.id, s.slug, s.name, s.classification::text as classification, s.risk_level,
      length(coalesce(s.description, '')) as dlen,
      (lower(coalesce(s.description, '')) ~ '^(a|an|the)?\s*(form|type|kind|version|variant|salt|ester) of '
        or lower(coalesce(s.description, '')) like lower(s.name) || ' is a %') as circular,
      (select count(*)::int from research_source_substances r where r.substance_id = s.id) as sources,
      (select count(*)::int from research_findings f where f.substance_id = s.id and f.review_status <> 'rejected') as findings,
      (select coalesce(array_agg(cr.category order by cr.category), '{}') from substance_routes sr join category_routes cr on cr.id = sr.category_route_id where sr.substance_id = s.id) as routes
    from substances s
    where is_site_admin()
      and (p_classification is null or s.classification::text = p_classification)
  ),
  scored as (
    select *,
      array_remove(array[
        case when dlen < 80 then 'description under 80 characters' end,
        case when circular then 'description is circular' end,
        case when sources = 0 then 'no linked sources' end,
        case when findings = 0 then 'no findings' end,
        case when cardinality(routes) = 0 then 'no category route' end
      ], null) as reasons,
      (case when dlen < 80 then 3 else 0 end + case when circular then 3 else 0 end
       + case when sources = 0 then 2 else 0 end + case when findings = 0 then 1 else 0 end) as score
    from base
  )
  select slug, name, classification, risk_level, dlen, circular, sources, findings, routes, reasons, score
  from scored
  where score > 0
  order by score desc, (classification = 'Everyday') desc, name asc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;
revoke all on function research_queue(integer, text) from public, anon;
grant execute on function research_queue(integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Record a validated, staged submission (called by the connector as the owner).
-- ---------------------------------------------------------------------------
create or replace function admin_record_research_submission(
  p_idempotency_key text, p_label text, p_client text, p_is_test boolean,
  p_payload jsonb, p_report jsonb, p_batch_id uuid, p_substance_slugs text[]
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row research_submissions%rowtype; v_existing research_submissions%rowtype;
begin
  if auth.uid() is null or not is_site_admin() then raise exception 'site_admin or site_owner role is required'; end if;
  select * into v_existing from research_submissions where submitted_by = auth.uid() and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('id', v_existing.id, 'duplicate', true, 'status', v_existing.status, 'report', v_existing.report, 'created_at', v_existing.created_at);
  end if;
  insert into research_submissions (submitted_by, client_name, idempotency_key, label, is_test, payload, report, import_batch_id, substance_slugs)
  values (auth.uid(), nullif(btrim(p_client), ''), p_idempotency_key, btrim(p_label), coalesce(p_is_test, false), p_payload, coalesce(p_report, '{}'::jsonb), p_batch_id, coalesce(p_substance_slugs, '{}'))
  returning * into v_row;
  insert into moderation_log (admin_user_id, action_type, target_type, target_id, note)
  values (auth.uid(), 'research_submission_received', 'research_submission', v_row.id, format('%s (%s)', v_row.label, coalesce(v_row.client_name, 'unknown client')));
  return jsonb_build_object('id', v_row.id, 'duplicate', false, 'status', v_row.status, 'created_at', v_row.created_at);
end $$;
revoke all on function admin_record_research_submission(text, text, text, boolean, jsonb, jsonb, uuid, text[]) from public, anon;
grant execute on function admin_record_research_submission(text, text, text, boolean, jsonb, jsonb, uuid, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Publish an approved submission (owner only).
-- ---------------------------------------------------------------------------
create or replace function admin_publish_research_submission(p_id uuid, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v research_submissions%rowtype;
  item jsonb; v_sub substances%rowtype; v_slug text;
  v_prev jsonb; v_next jsonb;
  v_desc_count integer := 0; v_gloss_count integer := 0; v_findings integer := 0;
  v_undo_desc jsonb := '[]'::jsonb; v_undo_gloss jsonb := '[]'::jsonb;
  v_has_v2 boolean; v_gslug text; v_prev_g jsonb; v_term text; v_def text;
begin
  if auth.uid() is null or not is_site_owner() then raise exception 'site_owner role is required'; end if;
  select * into v from research_submissions where id = p_id for update;
  if not found then raise exception 'unknown submission'; end if;
  if v.status <> 'needs_review' then raise exception 'submission is %, not needs_review', v.status; end if;

  -- 1. Descriptions / origin / half-life, with history.
  for item in select value from jsonb_array_elements(coalesce(v.payload->'substance_updates', '[]'::jsonb)) loop
    v_slug := item->>'slug';
    select * into v_sub from substances where slug = v_slug;
    if not found then continue; end if;
    v_prev := jsonb_build_object('description', v_sub.description, 'origin', v_sub.origin, 'half_life', v_sub.half_life);
    v_next := jsonb_build_object(
      'description', coalesce(nullif(btrim(item->>'description'), ''), v_sub.description),
      'origin', coalesce(nullif(btrim(item->>'origin'), ''), v_sub.origin),
      'half_life', coalesce(nullif(btrim(item->>'half_life'), ''), v_sub.half_life));
    if v_prev = v_next then continue; end if;
    update substances set
      description = v_next->>'description',
      origin = v_next->>'origin',
      half_life = v_next->>'half_life',
      updated_at = now()
    where id = v_sub.id;
    insert into substance_description_history (substance_id, submission_id, previous, next, changed_by)
    values (v_sub.id, v.id, v_prev, v_next, auth.uid());
    v_undo_desc := v_undo_desc || jsonb_build_object('substance_id', v_sub.id, 'previous', v_prev);
    v_desc_count := v_desc_count + 1;
  end loop;

  -- 2. Glossary terms (v1 columns always; v2 tags/bearings/detail when present).
  select exists (select 1 from information_schema.columns where table_name = 'glossary_terms' and column_name = 'tags') into v_has_v2;
  for item in select value from jsonb_array_elements(coalesce(v.payload->'glossary_terms', '[]'::jsonb)) loop
    v_term := btrim(item->>'term');
    v_def := btrim(item->>'definition');
    if v_term = '' or v_def = '' then continue; end if;
    v_gslug := btrim(regexp_replace(lower(v_term), '[^a-z0-9]+', '-', 'g'), '-');
    select to_jsonb(g) into v_prev_g from glossary_terms g where lower(g.slug) = v_gslug;
    v_undo_gloss := v_undo_gloss || jsonb_build_object('slug', v_gslug, 'previous', v_prev_g);
    if v_has_v2 then
      execute $q$
        insert into glossary_terms (term, slug, definition, category, detail, tags, bearings)
        values ($1, $2, $3, $4, $5, coalesce($6, '{}'::text[]), coalesce($7, '{}'::text[]))
        on conflict (slug) do update set term = excluded.term, definition = excluded.definition,
          category = coalesce(excluded.category, glossary_terms.category),
          detail = coalesce(excluded.detail, glossary_terms.detail),
          tags = case when cardinality(excluded.tags) > 0 then excluded.tags else glossary_terms.tags end,
          bearings = case when cardinality(excluded.bearings) > 0 then excluded.bearings else glossary_terms.bearings end,
          updated_at = now()
      $q$ using v_term, v_gslug, v_def, nullif(btrim(item->>'category'), ''), nullif(btrim(item->>'detail'), ''),
            (select array_agg(x) from jsonb_array_elements_text(coalesce(item->'tags', '[]'::jsonb)) x),
            (select array_agg(x) from jsonb_array_elements_text(coalesce(item->'bearings', '[]'::jsonb)) x);
    else
      insert into glossary_terms (term, slug, definition, category)
      values (v_term, v_gslug, v_def, nullif(btrim(item->>'category'), ''))
      on conflict (slug) do update set term = excluded.term, definition = excluded.definition,
        category = coalesce(excluded.category, glossary_terms.category), updated_at = now();
    end if;
    v_gloss_count := v_gloss_count + 1;
  end loop;

  -- 3. Findings staged by this batch become approved (the reviewer has read the report).
  if v.import_batch_id is not null then
    update research_findings set review_status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
    where import_batch_id = v.import_batch_id and review_status = 'pending_review';
    get diagnostics v_findings = row_count;
  end if;

  update research_submissions set status = 'published', reviewed_by = auth.uid(), reviewed_at = now(),
    review_note = nullif(btrim(p_note), ''), undo = jsonb_build_object('descriptions', v_undo_desc, 'glossary', v_undo_gloss), updated_at = now()
  where id = v.id;
  insert into moderation_log (admin_user_id, action_type, target_type, target_id, note)
  values (auth.uid(), 'research_submission_published', 'research_submission', v.id,
          format('%s: %s description updates, %s glossary terms, %s findings approved', v.label, v_desc_count, v_gloss_count, v_findings));
  return jsonb_build_object('id', v.id, 'descriptions', v_desc_count, 'glossary_terms', v_gloss_count, 'findings_approved', v_findings);
end $$;
revoke all on function admin_publish_research_submission(uuid, text) from public, anon;
grant execute on function admin_publish_research_submission(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Reject: drop the staged batch, keep the record.
-- ---------------------------------------------------------------------------
create or replace function admin_reject_research_submission(p_id uuid, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v research_submissions%rowtype; v_revert jsonb := null;
begin
  if auth.uid() is null or not is_site_owner() then raise exception 'site_owner role is required'; end if;
  select * into v from research_submissions where id = p_id for update;
  if not found then raise exception 'unknown submission'; end if;
  if v.status <> 'needs_review' then raise exception 'submission is %, not needs_review', v.status; end if;
  if v.import_batch_id is not null then v_revert := admin_revert_import_batch(v.import_batch_id); end if;
  update research_submissions set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_note = nullif(btrim(p_note), ''), updated_at = now() where id = v.id;
  insert into moderation_log (admin_user_id, action_type, target_type, target_id, note)
  values (auth.uid(), 'research_submission_rejected', 'research_submission', v.id, coalesce(nullif(btrim(p_note), ''), v.label));
  return jsonb_build_object('id', v.id, 'batch_revert', v_revert);
end $$;
revoke all on function admin_reject_research_submission(uuid, text) from public, anon;
grant execute on function admin_reject_research_submission(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Revert a published submission.
-- ---------------------------------------------------------------------------
create or replace function admin_revert_research_submission(p_id uuid, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v research_submissions%rowtype; item jsonb; v_revert jsonb := null; v_desc integer := 0; v_gloss integer := 0; v_has_v2 boolean;
begin
  if auth.uid() is null or not is_site_owner() then raise exception 'site_owner role is required'; end if;
  select * into v from research_submissions where id = p_id for update;
  if not found then raise exception 'unknown submission'; end if;
  if v.status <> 'published' then raise exception 'submission is %, not published', v.status; end if;

  for item in select value from jsonb_array_elements(coalesce(v.undo->'descriptions', '[]'::jsonb)) loop
    update substances set
      description = item->'previous'->>'description',
      origin = item->'previous'->>'origin',
      half_life = item->'previous'->>'half_life',
      updated_at = now()
    where id = (item->>'substance_id')::uuid;
    v_desc := v_desc + 1;
  end loop;

  select exists (select 1 from information_schema.columns where table_name = 'glossary_terms' and column_name = 'tags') into v_has_v2;
  for item in select value from jsonb_array_elements(coalesce(v.undo->'glossary', '[]'::jsonb)) loop
    if item->'previous' is null or jsonb_typeof(item->'previous') = 'null' then
      delete from glossary_terms where lower(slug) = item->>'slug';
    elsif v_has_v2 then
      execute $q$ update glossary_terms set term = $1, definition = $2, category = $3, detail = $4,
        tags = coalesce($5, '{}'::text[]), bearings = coalesce($6, '{}'::text[]), updated_at = now() where lower(slug) = $7 $q$
      using item->'previous'->>'term', item->'previous'->>'definition', item->'previous'->>'category', item->'previous'->>'detail',
        (select array_agg(x) from jsonb_array_elements_text(coalesce(item->'previous'->'tags', '[]'::jsonb)) x),
        (select array_agg(x) from jsonb_array_elements_text(coalesce(item->'previous'->'bearings', '[]'::jsonb)) x),
        item->>'slug';
    else
      update glossary_terms set term = item->'previous'->>'term', definition = item->'previous'->>'definition',
        category = item->'previous'->>'category', updated_at = now() where lower(slug) = item->>'slug';
    end if;
    v_gloss := v_gloss + 1;
  end loop;

  if v.import_batch_id is not null then v_revert := admin_revert_import_batch(v.import_batch_id); end if;
  update research_submissions set status = 'reverted', review_note = coalesce(nullif(btrim(p_note), ''), review_note), updated_at = now() where id = v.id;
  insert into moderation_log (admin_user_id, action_type, target_type, target_id, note)
  values (auth.uid(), 'research_submission_reverted', 'research_submission', v.id,
          format('%s: restored %s descriptions, %s glossary rows', v.label, v_desc, v_gloss));
  return jsonb_build_object('id', v.id, 'descriptions_restored', v_desc, 'glossary_restored', v_gloss, 'batch_revert', v_revert);
end $$;
revoke all on function admin_revert_research_submission(uuid, text) from public, anon;
grant execute on function admin_revert_research_submission(uuid, text) to authenticated;

notify pgrst, 'reload schema';
