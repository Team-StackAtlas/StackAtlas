-- Add the 13th canonical category (Vitality / Immune Health) and route the
-- clearly immune-oriented substances that previously had no honest home.
insert into category_routes (domain, category)
select 'Vitality', 'Immune Health'
where not exists (
  select 1 from category_routes where domain = 'Vitality' and category = 'Immune Health'
);

with target as (
  select id from category_routes where domain = 'Vitality' and category = 'Immune Health'
)
insert into substance_routes (substance_id, category_route_id)
select s.id, t.id
from substances s
cross join target t
where s.slug in (
  'andrographis',
  'pelargonium-sidoides',
  'bee-propolis',
  'bovine-colostrum',
  'thymosin-alpha-1',
  'll-37',
  'guduchi'
)
and not exists (
  select 1 from substance_routes sr
  where sr.substance_id = s.id and sr.category_route_id = t.id
);
