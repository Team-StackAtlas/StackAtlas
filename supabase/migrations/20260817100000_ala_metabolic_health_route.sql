-- Alpha-lipoic acid is routed to Longevity and Digestive Health but not
-- Metabolic Health — its flagship evidence base (diabetic peripheral
-- neuropathy, glycemia). Same routing-gap class as ashwagandha/CoQ10/
-- melatonin. Idempotent.
insert into substance_routes (substance_id, category_route_id)
select s.id, cr.id
from substances s, category_routes cr
where s.slug = 'alpha-lipoic-acid'
  and cr.category = 'Metabolic Health'
  and not exists (
    select 1 from substance_routes sr
    where sr.substance_id = s.id and sr.category_route_id = cr.id
  );
