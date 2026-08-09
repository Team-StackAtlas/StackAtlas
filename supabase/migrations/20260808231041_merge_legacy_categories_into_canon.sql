-- Merge 12 legacy categories into the 12 canonical categories per TAXONOMY_MASTER_GUIDE
with mapping(old_domain, old_cat, new_domain, new_cat) as (values
  ('Mind','Memory','Mind','Cognition'),
  ('Mind','Focus','Mind','Cognition'),
  ('Mind','Stress','Mind','Mood & Stress'),
  ('Mind','Mood','Mind','Mood & Stress'),
  ('Mind','Sleep','Mind','Recovery'),
  ('Body','Strength & Muscle','Body','Performance'),
  ('Body','Endurance','Body','Performance'),
  ('Body','Recovery','Mind','Recovery'),
  ('Body','Fat Loss','Vitality','Metabolic Health'),
  ('Vitality','Hormones','Vitality','Hormonal Health'),
  ('Vitality','Sexual Health','Vitality','Hormonal Health'),
  ('Vitality','Gut Health','Vitality','Digestive Health')
),
pairs as (
  select old_cr.id as old_id, new_cr.id as new_id
  from mapping m
  join category_routes old_cr on old_cr.domain = m.old_domain and old_cr.category = m.old_cat
  join category_routes new_cr on new_cr.domain = m.new_domain and new_cr.category = m.new_cat
),
repointed as (
  update substance_routes sr
  set category_route_id = p.new_id
  from pairs p
  where sr.category_route_id = p.old_id
    and not exists (
      select 1 from substance_routes sr2
      where sr2.substance_id = sr.substance_id
        and sr2.category_route_id = p.new_id
    )
  returning sr.substance_id, sr.category_route_id
),
dropped_dupes as (
  delete from substance_routes sr
  using pairs p
  where sr.category_route_id = p.old_id
  returning sr.substance_id
)
delete from category_routes cr
using pairs p
where cr.id = p.old_id;
