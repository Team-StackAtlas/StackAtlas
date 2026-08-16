-- Two owner-approved taxonomy cleanups (2026-08-16):
--
-- 1. vitamin-c route swap: Mood & Stress -> Immune Health. Its three route
--    slots were full; immune support is its predominant honest use, and
--    Mood & Stress was its weakest route.
-- 2. Drop the three non-canonical 'All'-domain category_routes rows left
--    over from the original mock seed (Beginner-Friendly, Novel, Popular)
--    plus the 12 substance_routes rows pointing at them. The canon is
--    exactly 13 categories across Mind/Body/Vitality; no app surface
--    renders an 'All' domain.
--
-- All statements guarded for idempotency.

-- 1a. Remove vitamin-c's Mood & Stress route.
delete from substance_routes sr
using substances s, category_routes cr
where sr.substance_id = s.id
  and sr.category_route_id = cr.id
  and s.slug = 'vitamin-c'
  and cr.domain = 'Mind' and cr.category = 'Mood & Stress';

-- 1b. Add vitamin-c to Immune Health.
with target as (
  select id from category_routes where domain = 'Vitality' and category = 'Immune Health'
)
insert into substance_routes (substance_id, category_route_id)
select s.id, t.id
from substances s
cross join target t
where s.slug = 'vitamin-c'
and not exists (
  select 1 from substance_routes sr
  where sr.substance_id = s.id and sr.category_route_id = t.id
);

-- 2a. Remove routes pointing at the legacy 'All'-domain collections.
delete from substance_routes sr
using category_routes cr
where sr.category_route_id = cr.id
  and cr.domain = 'All';

-- 2b. Remove the legacy 'All'-domain category rows themselves.
delete from category_routes where domain = 'All';
