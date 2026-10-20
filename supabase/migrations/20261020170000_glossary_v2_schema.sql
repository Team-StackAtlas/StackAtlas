-- Glossary v2 schema: two-tier definitions, tags, bearings.
--
-- * `definition` stays the mandatory one-to-two-sentence tooltip text.
-- * `detail` is an optional longer paragraph shown only on the full entry.
-- * `tags` answer "how is this word used" (e.g. slang, safety), separate
--   from `category`, which answers "what kind of word is it". A term can be
--   Usage Patterns *and* slang without a second home.
-- * `bearings` link a term to 0–5 goal bearings from the site vocabulary so
--   the glossary can be browsed by goal and substance pages can surface
--   their related terms.
-- The admin upsert RPC gains the three fields; the old 4-arg signature is
-- dropped so there is exactly one.

alter table glossary_terms
  add column if not exists detail text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists bearings text[] not null default '{}';

alter table glossary_terms
  drop constraint if exists glossary_terms_bearings_max,
  add constraint glossary_terms_bearings_max check (cardinality(bearings) <= 5);

drop function if exists admin_upsert_glossary_term(text, text, text, text);

create or replace function admin_upsert_glossary_term(
  p_term text,
  p_definition text,
  p_category text default null,
  p_slug text default null,
  p_detail text default null,
  p_tags text[] default '{}',
  p_bearings text[] default '{}'
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_term text;
  v_definition text;
  v_category text;
  v_slug text;
  v_row jsonb;
begin
  if auth.uid() is null or not is_site_admin() then
    raise exception 'site_admin or site_owner role is required';
  end if;
  v_term := btrim(coalesce(p_term, ''));
  v_definition := btrim(coalesce(p_definition, ''));
  v_category := nullif(btrim(coalesce(p_category, '')), '');
  -- Glossary text describes; it never endorses (same scrub as v1).
  v_term := btrim(regexp_replace(regexp_replace(v_term, '\y(recommended|proven|best|safe|effective)\y', '', 'gi'), '\s+', ' ', 'g'));
  v_definition := btrim(regexp_replace(regexp_replace(v_definition, '\y(recommended|proven|best|safe|effective)\y', '', 'gi'), '\s+', ' ', 'g'));
  if v_term = '' then raise exception 'term is required'; end if;
  if v_definition = '' then raise exception 'definition is required'; end if;
  if cardinality(coalesce(p_bearings, '{}')) > 5 then raise exception 'at most 5 bearings'; end if;
  v_slug := lower(coalesce(nullif(btrim(p_slug), ''), v_term));
  v_slug := regexp_replace(v_slug, '[^a-z0-9]+', '-', 'g');
  v_slug := btrim(v_slug, '-');
  if v_slug = '' then raise exception 'could not derive a slug'; end if;

  insert into glossary_terms (term, slug, definition, category, detail, tags, bearings)
  values (v_term, v_slug, v_definition, v_category, nullif(btrim(coalesce(p_detail, '')), ''), coalesce(p_tags, '{}'), coalesce(p_bearings, '{}'))
  on conflict (slug) do update set
    term = excluded.term,
    definition = excluded.definition,
    category = excluded.category,
    detail = excluded.detail,
    tags = excluded.tags,
    bearings = excluded.bearings,
    updated_at = now()
  returning to_jsonb(glossary_terms.*) into v_row;
  return v_row;
end $$;

revoke all on function admin_upsert_glossary_term(text, text, text, text, text, text[], text[]) from public, anon, authenticated;
grant execute on function admin_upsert_glossary_term(text, text, text, text, text, text[], text[]) to authenticated;
