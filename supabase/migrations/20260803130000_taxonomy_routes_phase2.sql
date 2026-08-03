-- Taxonomy overhaul phase 2: route the remaining substances the phase-1 keyword
-- rules left unrouted, using a curated botanical/functional-class lexicon
-- (aromatase inhibitors -> Hormonal, adaptogens -> Mood, functional mushrooms ->
-- Digestive/Longevity, cannabinoids -> Mood & Stress, etc.). Reviewed in
-- taxonomy-review-phase2.csv. Idempotent; only touches substances with no routes.
with codes(code, domain, category) as (values
    ('CG','Mind','Cognition'),('RC','Mind','Recovery'),('PF','Body','Performance'),
    ('LG','Vitality','Longevity'),('MS','Mind','Mood & Stress'),('MH','Vitality','Metabolic Health'),
    ('HH','Vitality','Hormonal Health'),('DH','Vitality','Digestive Health'),('HT','Vitality','Heart Health'),
    ('PI','Body','Pain & Injury'),('JM','Body','Joint & Mobility'),('BS','Body','Beauty & Skin')
),
proposal as (
  select key as slug, unnest(string_to_array(value, ',')) as code
  from jsonb_each_text('{"active-hexose-correlated-compound":"DH","afamelanotide":"HH","agaricus-blazei":"LG","alanyl-glutamine":"DH","anastrozole":"HH","antrodia-cinnamomea":"LG","apigenin":"RC,LG","artichoke-leaf":"DH","banaba":"MH","barberry":"MH","beetroot-extract":"PF","beta-sitosterol":"HT","bilberry":"LG","black-cohosh":"HH","black-tea-extract":"LG","blue-lotus":"MS","boron":"JM","boswellia":"PI","boswellic-acids":"PI","branched-chain-amino-acids":"PF","burdock":"DH","butcher-s-broom":"HT","butterbur":"CG","cagrilintide":"MH","calcium-ascorbate":"JM","calcium-carbonate":"JM","calcium-citrate":"JM","cannabigerol":"MS","cannabinol":"MS","capsaicin":"PI","capsiate":"MH","ceylon-cinnamon":"MH","chaga":"DH","chamomile":"RC","chasteberry":"HH","chlorella":"LG","cholecalciferol":"JM","cholecalciferol-vitamin-d3":"JM","cinnamon":"MH","cistanche":"HH","citrulline-malate":"PF","coleus-forskohlii":"MH","coptis":"MH","cordyceps-militaris":"PF","cranberry":"DH","d-aspartic-acid":"HH","d-ribose":"PF","damiana":"MS","dandelion":"CG","danshen":"HT","dasatinib":"LG","delta-8-tetrahydrocannabinol":"MS","delta-9-tetrahydrocannabinol":"MS","desmopressin":"HH","devil-s-claw":"PI","echinacea":"DH","elderberry":"LG","enclomiphene":"HH","enoki":"DH","ergocalciferol":"JM","exemestane":"HH","fadogia-agrestis":"HH","fennel":"DH","fenugreek":"HH","feverfew":"CG","forskolin":"MH","genistein":"LG","ginger":"DH","goldenseal":"MH","green-tea":"LG","gymnema":"MH","horny-goat-weed":"HH","horse-chestnut":"HT","kava":"MS","kudzu":"LG","l-arginine":"HT","l-glutamine":"DH","l-isoleucine":"PF","l-leucine":"PF","l-lysine":"JM","l-valine":"PF","lavender":"RC","lentinan":"DH","letrozole":"HH","lion-s-tail":"CG","luteolin":"LG","maca":"HH","magnolia-bark":"RC","maitake":"DH","marshmallow-root":"DH","menaquinone-4":"JM","menaquinone-7":"JM","meshima":"DH","milk-thistle":"DH","muira-puama":"HH","navitoclax":"LG","ophiocordyceps-sinensis":"PF","oyster-mushroom":"DH","passionflower":"RC","peppermint-oil":"DH","phylloquinone":"HT","plant-sterol-esters":"HT","policosanol":"HT","polysaccharide-k":"DH","polysaccharopeptide":"DH","pomegranate-extract":"LG","poria":"DH","pramlintide":"MH","psilocybin":"DH","pygeum":"HH","red-clover":"LG","red-yeast-rice":"HT","reishi":"DH","sermorelin":"HH","shatavari":"HH","shiitake":"DH","silicon":"JM","slippery-elm":"DH","spirulina":"LG","split-gill-mushroom":"DH","tetrahydrocannabivarin":"MS","tianeptine":"MS","tremella":"BS","tribulus":"HH","turkey-tail":"DH","turmeric":"PI","valerian":"RC","vanadium":"LG","white-willow-bark":"PI"}'::jsonb)
)
insert into substance_routes (substance_id, category_route_id)
select s.id, cr.id
from proposal p
join codes c on c.code = p.code
join substances s on s.slug = p.slug
join category_routes cr on cr.domain = c.domain and cr.category = c.category
where not exists (select 1 from substance_routes sr where sr.substance_id = s.id)
on conflict do nothing;

notify pgrst, 'reload schema';
