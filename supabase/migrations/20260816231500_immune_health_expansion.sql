-- Immune Health expansion: route the clearly immune-predominant substances
-- that the phase 1-3 routing passes placed elsewhere (or nowhere) because
-- the Immune Health category did not exist yet when they ran.
--
-- Additions only (existing routes untouched); each substance's predominant
-- honest use is immune support:
--   echinacea, elderberry   - cold/flu botanicals
--   zinc, zinc-gluconate    - immune/cold lozenge use (gluconate was unrouted)
--   astragalus              - TCM immune tonic
--   beta-glucans            - taken specifically as immune modulators
--   turkey-tail             - immune-support mushroom (PSK)
--
-- Deliberately NOT routed here (flagged for review instead): vitamin-c
-- (already carries 3 routes; adding Immune requires swapping one out),
-- reishi and oregano-oil (multi-purpose; immune not clearly predominant),
-- zinc-picolinate and sodium-ascorbate (general nutrient forms; forcing a
-- route would be over-routing).
with target as (
  select id from category_routes where domain = 'Vitality' and category = 'Immune Health'
)
insert into substance_routes (substance_id, category_route_id)
select s.id, t.id
from substances s
cross join target t
where s.slug in (
  'echinacea',
  'elderberry',
  'zinc',
  'zinc-gluconate',
  'astragalus',
  'beta-glucans',
  'turkey-tail'
)
and not exists (
  select 1 from substance_routes sr
  where sr.substance_id = s.id and sr.category_route_id = t.id
);
