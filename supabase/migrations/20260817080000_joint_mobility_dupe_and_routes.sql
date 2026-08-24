-- Joint & Mobility triage (batch 12 prep):
--
-- 1. Merge importer-era dupe `cholecalciferol` -> `cholecalciferol-vitamin-d3`
--    (canonical: 6 sources, 5 findings, aliases already include
--    "cholecalciferol"/"colecalciferol"; dupe has zero references and one
--    Joint & Mobility route). Same alias-reassignment pattern as
--    20260817031000. NOTE: `vitamin-d` (the D2+D3 umbrella row, real refs)
--    and `ergocalciferol` (D2) are deliberate rows and are NOT touched.
--
-- 2. Add the Joint & Mobility route to boswellia, methylsulfonylmethane,
--    s-adenosyl-l-methionine, and hyaluronic-acid — all four have joint/OA
--    as a flagship use but were not routed to the category (same gap class
--    as collagen-peptides/ashwagandha/CoQ10). Idempotent.
do $$
declare
  canon uuid;
  canon_name text;
  dupe uuid;
  dupe_name text;
begin
  select id, name into canon, canon_name from substances where slug = 'cholecalciferol-vitamin-d3';
  select id, name into dupe, dupe_name from substances where slug = 'cholecalciferol';
  if canon is not null and dupe is not null then
    delete from substance_aliases a
    where a.substance_id = dupe
      and (lower(a.alias) = lower(canon_name)
           or exists (select 1 from substance_aliases b
                      where b.substance_id = canon and lower(b.alias) = lower(a.alias)));
    update substance_aliases set substance_id = canon where substance_id = dupe;
    insert into substance_aliases (substance_id, alias)
    select canon, dupe_name
    where lower(dupe_name) <> lower(canon_name)
      and not exists (select 1 from substance_aliases b
                      where lower(b.alias) = lower(dupe_name));
    delete from substance_routes where substance_id = dupe;
    delete from substance_type_tags where substance_id = dupe;
    delete from substance_administration_methods where substance_id = dupe;
    delete from substance_effects where substance_id = dupe;
    delete from substance_markers where substance_id = dupe;
    delete from substance_pairings where substance_id = dupe or pairs_with_id = dupe;
    delete from substances where id = dupe;
  end if;
end $$;

insert into substance_routes (substance_id, category_route_id)
select s.id, cr.id
from substances s, category_routes cr
where s.slug in ('boswellia', 'methylsulfonylmethane', 's-adenosyl-l-methionine', 'hyaluronic-acid')
  and cr.category = 'Joint & Mobility'
  and not exists (
    select 1 from substance_routes sr
    where sr.substance_id = s.id and sr.category_route_id = cr.id
  );
