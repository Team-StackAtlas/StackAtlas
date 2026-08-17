-- Merge the synonym-duplicate substance 'n-acetylcysteine' into the
-- canonical 'n-acetyl-l-cysteine' (name "N-acetyl-L-cysteine (NAC)").
--
-- The two rows literally alias each other; the canonical row carries all
-- research (7 linked sources, 4 findings). The duplicate carried only
-- catalog metadata: 3 brand_products, 2 routes (Mood & Stress, Longevity),
-- 6 type tags, 4 administration methods, 1 alias, and zero user content
-- (posts/stacks/test_results all 0 at merge time).
--
-- Strategy: repoint brand_products; copy over any route/tag/method the
-- canonical lacks; drop the duplicate's remaining children; delete the row.
-- The canonical's existing aliases already include "N-acetylcysteine" and
-- "acetylcysteine", so lookups by the old name keep resolving. Idempotent:
-- everything is guarded and the whole script is a no-op once the duplicate
-- slug is gone.
do $$
declare
  canon uuid;
  dupe uuid;
begin
  select id into canon from substances where slug = 'n-acetyl-l-cysteine';
  select id into dupe from substances where slug = 'n-acetylcysteine';
  if canon is null or dupe is null then
    return; -- already merged (or catalog differs); nothing to do
  end if;

  update brand_products set substance_id = canon where substance_id = dupe;

  insert into substance_routes (substance_id, category_route_id)
  select canon, sr.category_route_id
  from substance_routes sr
  where sr.substance_id = dupe
    and not exists (
      select 1 from substance_routes x
      where x.substance_id = canon and x.category_route_id = sr.category_route_id
    );

  insert into substance_type_tags (substance_id, type_tag_id)
  select canon, st.type_tag_id
  from substance_type_tags st
  where st.substance_id = dupe
    and not exists (
      select 1 from substance_type_tags x
      where x.substance_id = canon and x.type_tag_id = st.type_tag_id
    );

  insert into substance_administration_methods (substance_id, administration_method_id)
  select canon, sam.administration_method_id
  from substance_administration_methods sam
  where sam.substance_id = dupe
    and not exists (
      select 1 from substance_administration_methods x
      where x.substance_id = canon and x.administration_method_id = sam.administration_method_id
    );

  delete from substance_routes where substance_id = dupe;
  delete from substance_type_tags where substance_id = dupe;
  delete from substance_administration_methods where substance_id = dupe;
  delete from substance_aliases where substance_id = dupe;
  delete from substance_effects where substance_id = dupe;
  delete from substance_markers where substance_id = dupe;
  delete from substance_pairings where substance_id = dupe or pairs_with_id = dupe;

  delete from substances where id = dupe;
end $$;
