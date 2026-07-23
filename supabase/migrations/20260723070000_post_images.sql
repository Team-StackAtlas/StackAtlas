-- Optional image on community posts (Dispatches/Signals).
--
-- The frontend attaches a downscaled JPEG data-url; storing it in a text
-- column keeps this self-contained (no storage bucket / signed-url plumbing).
-- Until this is applied the app degrades gracefully: create_post ignores the
-- unknown image_url payload key, and the posts read falls back to the legacy
-- column list when image_url doesn't exist yet.
alter table posts add column if not exists image_url text;

-- Same body as 20260713001500_posts_persistence.sql, plus image_url.
create or replace function create_post(p_post jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_kind text; v_ref text; v_bearing uuid;
  v_substance uuid; v_brand uuid; v_stack uuid;
begin
  if auth.uid() is null then raise exception 'sign in to post'; end if;
  v_kind := lower(nullif(btrim(p_post->>'kind'), ''));
  if v_kind not in ('dispatch', 'signal') then raise exception 'invalid kind: %', coalesce(v_kind, '(missing)'); end if;
  if nullif(btrim(p_post->>'title'), '') is null then raise exception 'title is required'; end if;
  if nullif(btrim(p_post->>'content'), '') is null then raise exception 'content is required'; end if;

  v_substance := import_resolve_substance(p_post->>'substance_slug');
  select id into v_brand from brands where slug = import_slugify(p_post->>'brand_slug');
  if nullif(btrim(p_post->>'stack_id'), '') is not null then
    select id into v_stack from stacks where id = (p_post->>'stack_id')::uuid;
  end if;

  insert into posts (kind, title, content, author_id, domain, category, subcategory,
                     substance_id, brand_id, stack_id, structured_content, log_details,
                     dispatch_protocol, quality_score, image_url, updated_at)
  values (
    v_kind::post_kind,
    btrim(p_post->>'title'),
    p_post->>'content',
    auth.uid(),
    nullif(btrim(p_post->>'domain'), ''),
    nullif(btrim(p_post->>'category'), ''),
    nullif(btrim(p_post->>'subcategory'), ''),
    v_substance, v_brand, v_stack,
    p_post->'structured_content',
    p_post->'log_details',
    p_post->'dispatch_protocol',
    coalesce(nullif(btrim(p_post->>'quality_score'), '')::integer, 0),
    nullif(btrim(p_post->>'image_url'), ''),
    now()
  )
  returning id into v_id;

  if jsonb_typeof(p_post->'bearings') = 'array' then
    for v_ref in select value #>> '{}' from jsonb_array_elements(p_post->'bearings') loop
      select id into v_bearing from bearings where slug = import_slugify(v_ref);
      if v_bearing is not null then
        insert into post_bearings (post_id, bearing_id) values (v_id, v_bearing) on conflict do nothing;
      end if;
    end loop;
  end if;

  return v_id;
end $$;

revoke all on function create_post(jsonb) from public, anon, authenticated;
grant execute on function create_post(jsonb) to authenticated;

notify pgrst, 'reload schema';
