-- Ashwagandha has zero category routes despite 4 findings and 12 catalog
-- references — the same routing gap collagen-peptides had before
-- 20260817014500. Without a route it is invisible in every category browse.
-- Add its flagship route (Mood & Stress); other routes can follow when the
-- relevant category passes stage their evidence. Idempotent.
insert into substance_routes (substance_id, category_route_id)
select s.id, cr.id
from substances s, category_routes cr
where s.slug = 'ashwagandha'
  and cr.category = 'Mood & Stress'
  and not exists (
    select 1 from substance_routes sr
    where sr.substance_id = s.id and sr.category_route_id = cr.id
  );
