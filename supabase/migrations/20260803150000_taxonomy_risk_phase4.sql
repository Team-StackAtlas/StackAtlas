-- Taxonomy overhaul phase 4: fill risk_level for the 19 substances the phase-1
-- inference left null. These entered the catalog after 20260803120000 was
-- authored (a post-phase-1 importer batch: organic UV filters, probiotics/
-- postbiotics, medicinal-mushroom extracts, kratom alkaloids, a GH
-- secretagogue), so they never received a risk tier -- confirmed by
-- 'methamphetamine' and 'tazarotene', which appear in phase-1's own lists yet
-- were re-imported as null. Each level below matches the exact phase-1 rule via
-- a direct sibling; no new policy, no routing or classification changes.
-- Idempotent: only touches rows still null.

-- Low: benign supplement forms, probiotics/postbiotics, medicinal-mushroom
-- polysaccharides, and the kratom family (phase-1 set kratom + 7-hydroxy-
-- mitragynine to Low; matched here for internal consistency).
--   coenzyme-q10                        <- ubiquinol (its reduced form) = Low
--   escherichia-coli-nissle-1917        <- all probiotics = Low
--   lactobacillus-lb-postbiotic-preparation <- probiotics/postbiotics = Low
--   lentinan, lion-s-mane-mushroom,
--   polysaccharide-k, split-gill-mushroom   <- shiitake/turkey-tail/reishi = Low
--   mitragynine, mitragynine-pseudoindoxyl   <- kratom, 7-hydroxymitragynine = Low
update substances set risk_level='Low', updated_at=now()
 where risk_level is null and slug = any(string_to_array(
   'coenzyme-q10,escherichia-coli-nissle-1917,lactobacillus-lb-postbiotic-preparation,lentinan,lion-s-mane-mushroom,mitragynine,mitragynine-pseudoindoxyl,polysaccharide-k,split-gill-mushroom',
   ','));

-- Moderate: organic UV filters, illicit/Rx stimulants, GH secretagogues,
-- prescription retinoids, and psychoactive plant compounds.
--   bemotrizinol, bisoctrizole, ecamsule,
--   ethylhexyl-triazone,
--   diethylamino-hydroxybenzoyl-hexyl-benzoate <- avobenzone/octocrylene/oxybenzone = Moderate
--   methamphetamine                    <- amphetamine-mixed-salts/dextroamphetamine = Moderate (also in phase-1 list)
--   tazarotene                         <- adapalene/tretinoin/trifarotene = Moderate (also in phase-1 list)
--   pralmorelin                        <- ghrp-6/hexarelin/sermorelin (GH secretagogues) = Moderate
--   salvinorin-a                       <- psilocin/mescaline/lsd (psychedelics) = Moderate
--   amanita-muscaria-preparation       <- muscimol/ibotenic-acid (its actives) = Moderate
update substances set risk_level='Moderate', updated_at=now()
 where risk_level is null and slug = any(string_to_array(
   'amanita-muscaria-preparation,bemotrizinol,bisoctrizole,diethylamino-hydroxybenzoyl-hexyl-benzoate,ecamsule,ethylhexyl-triazone,methamphetamine,pralmorelin,salvinorin-a,tazarotene',
   ','));

notify pgrst, 'reload schema';
