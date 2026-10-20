-- Risk pass 2 (batch 18), 2026-09-15: surface the four interaction/risk
-- cautions queued by batch 11's dossier as health_risk effects, matching
-- the evidence staged in docs/data-packs/batches/2026-09-15-risk-pass-batch-18.
-- Wording follows the guduchi precedent (20260816234500): one cautious
-- sentence, year + source type in prose. Idempotent via exact-value guards.
--
-- NOTE: written in a session whose database connection was unavailable
-- (credential failure while the project reported healthy). Apply through
-- the normal migration pipeline, then confirm one new row per substance.
do $$
declare
  rec record;
begin
  for rec in
    select * from (values
      ('ginkgo-biloba',
       'A meta-analysis of 18 randomized trials (1,985 adults) found no evidence that standardized extract increases bleeding risk (2011); the conventional caution when combining ginkgo with anticoagulants or antiplatelet drugs rests on case reports rather than trial evidence.'),
      ('st-john-s-wort',
       'Inhibits serotonin reuptake, so combining it with SSRIs or other serotonergic antidepressants carries a case-report-documented risk of serotonin syndrome (systematic review, 2003) — a pharmacodynamic interaction separate from its CYP3A4 drug-level effects.'),
      ('red-yeast-rice',
       'Its monacolin K is chemically identical to lovastatin, so red yeast rice inherits the statin-class contraindication in pregnancy and lactation (animal teratogenicity; CNS and limb defects reported after in-utero statin exposure) (medication-safety review, 2019).'),
      ('hawthorn',
       'Hawthorn extract interferes with at least one common serum digoxin immunoassay (Abbott Digoxin III) and appears to act at the same cardiac Na/K-ATPase site as digoxin in cell studies (2010); patients taking digoxin should not add hawthorn without their clinician and lab being aware.')
    ) as t(slug, risk)
  loop
    insert into substance_effects (substance_id, kind, value)
    select s.id, 'health_risk', rec.risk
    from substances s
    where s.slug = rec.slug
      and not exists (
        select 1 from substance_effects se
        where se.substance_id = s.id
          and se.kind = 'health_risk'
          and se.value = rec.risk
      );
  end loop;
end $$;
