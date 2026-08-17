-- Owner-approved (2026-08-16): surface the guduchi (Giloy) liver-injury
-- signal on the substance profile, matching the research finding staged in
-- docs/data-packs/batches/2026-08-16-immune-health-batch-1 (PMID 35037744,
-- multicenter Indian case series). Cautious wording; idempotent.
insert into substance_effects (substance_id, kind, value)
select s.id, 'health_risk',
  'Reported cases of liver injury with autoimmune features temporally associated with use (multicenter Indian case series, 2022); caution advised with pre-existing liver conditions'
from substances s
where s.slug = 'guduchi'
and not exists (
  select 1 from substance_effects se
  where se.substance_id = s.id
    and se.kind = 'health_risk'
    and se.value like 'Reported cases of liver injury with autoimmune features%'
);
