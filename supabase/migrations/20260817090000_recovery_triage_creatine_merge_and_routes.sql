-- Recovery triage (batch 13 prep):
--
-- 1. Merge importer-era dupe `creatine` -> `creatine-monohydrate`.
--    The monohydrate row is canonical (7 linked sources, 4 findings, 9
--    catalog references, aliases already include "creatine"); the bare
--    `creatine` row has zero references. Unlike prior merges the canonical
--    here has NO routes while the dupe carries Metabolic Health and
--    Performance — so the dupe's routes are TRANSFERRED, not deleted.
--
-- 2. Route repairs for substances with findings but zero routes (same gap
--    class as ashwagandha/CoQ10): melatonin -> Recovery (its flagship,
--    sleep), l-theanine -> Mood & Stress (flagship: relaxation without
--    sedation), magnesium-glycinate -> Recovery (sleep-oriented form).
--    Additional routes can follow when those category passes stage
--    evidence. Idempotent.
do $$
declare
  canon uuid;
  canon_name text;
  dupe uuid;
  dupe_name text;
begin
  select id, name into canon, canon_name from substances where slug = 'creatine-monohydrate';
  select id, name into dupe, dupe_name from substances where slug = 'creatine';
  if canon is not null and dupe is not null then
    -- transfer routes the canonical does not already have
    update substance_routes sr set substance_id = canon
    where sr.substance_id = dupe
      and not exists (
        select 1 from substance_routes sr2
        where sr2.substance_id = canon and sr2.category_route_id = sr.category_route_id
      );
    delete from substance_routes where substance_id = dupe;
    -- alias handling (global unique on lower(alias)): reassign, then add name
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
from substances s
join category_routes cr on cr.category = case s.slug
    when 'melatonin' then 'Recovery'
    when 'l-theanine' then 'Mood & Stress'
    when 'magnesium-glycinate' then 'Recovery'
  end
where s.slug in ('melatonin', 'l-theanine', 'magnesium-glycinate')
  and not exists (
    select 1 from substance_routes sr
    where sr.substance_id = s.id and sr.category_route_id = cr.id
  );
