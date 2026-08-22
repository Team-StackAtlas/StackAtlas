-- Risk pass (batch 11), user-requested 2026-08-17: surface the interaction/
-- risk cautions queued in the batch 9-10 dossiers as health_risk effects,
-- matching the evidence staged in
-- docs/data-packs/batches/2026-08-17-risk-pass-batch-11 (and, for kava, the
-- hepatotoxicity review already staged in batch 9, PMID 20720265).
-- Wording follows the guduchi precedent (20260816234500): one cautious
-- sentence, year + source type in prose. Idempotent via prefix guards.
do $$
declare
  rec record;
begin
  for rec in
    select * from (values
      ('st-john-s-wort',
       'Induces CYP3A4 and P-glycoprotein, reducing blood levels of many drugs — documented failures include transplant rejection on cyclosporine, breakthrough bleeding and unplanned pregnancy on oral contraceptives, and reduced warfarin and HIV protease inhibitor effect (reviews, 2002/2019); interaction strength tracks the preparation''s hyperforin content.'),
      ('5-hydroxy-l-tryptophan',
       'Theoretical serotonin syndrome risk when combined with SSRIs, MAOIs, or other serotonergic drugs; published human cases attributed to 5-HTP are lacking (review, 2006), but toxicology guidance advises against the combination and no safe combined dose is established.'),
      ('kava',
       'Suspected rare severe hepatotoxicity — case reports led to 2002-03 bans in the EU and Canada and a US FDA advisory, though causality is contested; reported risk factors include overdose, prolonged use, and hepatotoxic co-medication, so caution with alcohol and liver-active drugs (clinical review, 2010).'),
      ('red-yeast-rice',
       'Active monacolin K is chemically identical to lovastatin, so combining with prescription statins adds unmonitored statin exposure; commercial monacolin K content varies more than 120-fold per daily serving across brands (product analysis, 2017).'),
      ('hawthorn',
       'A small randomized crossover study found no significant change in digoxin pharmacokinetics with co-administration (n=8, 2003), but the evidence is narrow — heart-failure patients taking digoxin or other cardiac drugs should involve their clinician.')
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
