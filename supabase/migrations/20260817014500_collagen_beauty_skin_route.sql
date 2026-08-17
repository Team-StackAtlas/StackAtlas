-- Add Beauty & Skin route to collagen-peptides (additions only).
-- It was routed Joint & Mobility only, but skin (hydration/elasticity/
-- wrinkles) is its other predominant honest use, and the batch-6 research
-- pack stages a 26-RCT meta-analysis on exactly that endpoint.
with target as (
  select id from category_routes where domain = 'Body' and category = 'Beauty & Skin'
)
insert into substance_routes (substance_id, category_route_id)
select s.id, t.id
from substances s
cross join target t
where s.slug = 'collagen-peptides'
and not exists (
  select 1 from substance_routes sr
  where sr.substance_id = s.id and sr.category_route_id = t.id
);
