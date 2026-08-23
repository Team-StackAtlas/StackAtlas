-- Merge importer-era dupe `dehydroepiandrosterone` -> `dhea-prasterone`
-- (canonical: 5 sources, 5 findings, alias already includes
-- "dehydroepiandrosterone"; dupe has zero references and aliases
-- "DHEA | prasterone" that collide with the canonical's identity).
-- `dehydroepiandrosterone-sulfate` (DHEA-S) is a distinct analyte row and
-- is NOT touched. Same alias-reassignment pattern as 20260817031000;
-- idempotent.
do $$
declare
  canon uuid;
  canon_name text;
  dupe uuid;
  dupe_name text;
begin
  select id, name into canon, canon_name from substances where slug = 'dhea-prasterone';
  select id, name into dupe, dupe_name from substances where slug = 'dehydroepiandrosterone';
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
