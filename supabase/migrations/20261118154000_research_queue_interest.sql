-- research_queue: break ties on catalog interest instead of alphabet.
--
-- Hundreds of substances share the top score (short description, no sources,
-- no findings), so the queue was serving them A to Z and the research director
-- would start with 1,3-butanediol. Usage signals are still too thin to rank
-- on (3 saved items, 1 post), so interest is a catalog proxy: products sold
-- that contain the substance, stacks that use it, a popular brand on record,
-- and any effects on record. Same signature as before, so this is an in-place
-- replace; the connector's callers see the same columns in a better order.

create or replace function research_queue(p_limit integer default 20, p_classification text default null)
returns table (
  slug text, name text, classification text, risk_level text,
  description_length integer, description_circular boolean,
  source_count integer, finding_count integer, routes text[],
  reasons text[], score integer
)
language sql stable security definer set search_path = public as $$
  with base as (
    select s.id, s.slug, s.name, s.classification::text as classification, s.risk_level,
      length(coalesce(s.description, '')) as dlen,
      (lower(coalesce(s.description, '')) ~ '^(a|an|the)?\s*(form|type|kind|version|variant|salt|ester) of '
        or lower(coalesce(s.description, '')) like lower(s.name) || ' is a %') as circular,
      (select count(*)::int from research_source_substances r where r.substance_id = s.id) as sources,
      (select count(*)::int from research_findings f where f.substance_id = s.id and f.review_status <> 'rejected') as findings,
      (select coalesce(array_agg(cr.category order by cr.category), '{}') from substance_routes sr join category_routes cr on cr.id = sr.category_route_id where sr.substance_id = s.id) as routes,
      (select count(*)::int from brand_products bp where bp.substance_id = s.id)
        + 2 * (select count(*)::int from stack_components sc where sc.substance_id = s.id)
        + (case when s.most_popular_brand_id is not null then 3 else 0 end)
        + (case when exists (select 1 from substance_effects se where se.substance_id = s.id) then 1 else 0 end) as interest
    from substances s
    where is_site_admin()
      and (p_classification is null or s.classification::text = p_classification)
  ),
  scored as (
    select *,
      array_remove(array[
        case when dlen < 80 then 'description under 80 characters' end,
        case when circular then 'description is circular' end,
        case when sources = 0 then 'no linked sources' end,
        case when findings = 0 then 'no findings' end,
        case when cardinality(routes) = 0 then 'no category route' end
      ], null) as reasons,
      (case when dlen < 80 then 3 else 0 end + case when circular then 3 else 0 end
       + case when sources = 0 then 2 else 0 end + case when findings = 0 then 1 else 0 end) as score
    from base
  )
  select slug, name, classification, risk_level, dlen, circular, sources, findings, routes, reasons, score
  from scored
  where score > 0
  order by score desc, interest desc, (classification = 'Everyday') desc, name asc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;
