-- Four substances carry verified research findings but sit in no category,
-- so they never appear on the Map. Flagship routes only; idempotent.
insert into substance_routes (substance_id, category_route_id)
select s.id, cr.id
from substances s
join category_routes cr on cr.category = any (case s.slug
    when 'bpc-157' then array['Recovery', 'Pain & Injury']
    when 'caffeine' then array['Performance', 'Cognition']
    when 'clenbuterol' then array['Performance', 'Metabolic Health']
    when 'lions-mane' then array['Cognition']
  end)
where s.slug in ('bpc-157', 'caffeine', 'clenbuterol', 'lions-mane')
  and not exists (
    select 1 from substance_routes sr
    where sr.substance_id = s.id and sr.category_route_id = cr.id
  );
