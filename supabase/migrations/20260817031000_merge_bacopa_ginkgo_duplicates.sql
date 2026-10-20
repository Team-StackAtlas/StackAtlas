-- Merge two more importer-era synonym duplicates (same pattern as the NAC
-- merge in 20260817011500):
--   bacopa  -> bacopa-monnieri  (canonical: 5 findings, 5 linked sources)
--   ginkgo  -> ginkgo-biloba    (canonical: 5 findings, 6 linked sources)
-- Both duplicates carry zero references (no sources, findings, products,
-- posts, or stack components) beyond one Cognition route and their aliases.
-- Aliases are globally unique on lower(alias), so the dupe's aliases are
-- REASSIGNED to the canonical row (not re-inserted), dropping any that
-- duplicate the canonical row's name or existing aliases; the dupe's own
-- display name is preserved as a new alias. Idempotent.
do $$
declare
  canon uuid;
  canon_name text;
  dupe uuid;
  dupe_name text;
begin
  -- bacopa -> bacopa-monnieri
  select id, name into canon, canon_name from substances where slug = 'bacopa-monnieri';
  select id, name into dupe, dupe_name from substances where slug = 'bacopa';
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

  -- ginkgo -> ginkgo-biloba
  select id, name into canon, canon_name from substances where slug = 'ginkgo-biloba';
  select id, name into dupe, dupe_name from substances where slug = 'ginkgo';
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
