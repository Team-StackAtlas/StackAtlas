-- Coenzyme Q10 is routed to Mood & Stress, Metabolic Health, and Longevity
-- but NOT Heart Health — its flagship indication (chronic heart failure
-- adjunct therapy, Q-SYMBIO). Same routing-gap class as collagen-peptides
-- (20260817014500) and ashwagandha (20260817054500). Idempotent.
insert into substance_routes (substance_id, category_route_id)
select s.id, cr.id
from substances s, category_routes cr
where s.slug = 'coenzyme-q10'
  and cr.category = 'Heart Health'
  and not exists (
    select 1 from substance_routes sr
    where sr.substance_id = s.id and sr.category_route_id = cr.id
  );
