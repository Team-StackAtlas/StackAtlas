-- Taxonomy overhaul phase 3: route 69 more substances the phase-1/2 rules left
-- unrouted, using a hand-verified high-confidence mapping from each substance's
-- description (growth-factor peptides -> Performance, statin/garlic/olive ->
-- Heart, retinols -> Beauty, broccoli antioxidants + glutathione -> Longevity,
-- chromium/appetite herbs -> Metabolic, etc.). Reviewed in
-- taxonomy-review-phase3.csv. The ~70 still-unrouted rows are deliberately left
-- alone: plain electrolytes, structural amino acids, and psychedelics/research
-- chemicals have no honest single goal category. Idempotent; only touches
-- substances with no routes.
with codes(code, domain, category) as (values
    ('CG','Mind','Cognition'),('RC','Mind','Recovery'),('PF','Body','Performance'),
    ('LG','Vitality','Longevity'),('MS','Mind','Mood & Stress'),('MH','Vitality','Metabolic Health'),
    ('HH','Vitality','Hormonal Health'),('DH','Vitality','Digestive Health'),('HT','Vitality','Heart Health'),
    ('PI','Body','Pain & Injury'),('JM','Body','Joint & Mobility'),('BS','Body','Beauty & Skin')
),
proposal as (
  select key as slug, value as code
  from jsonb_each_text('{"coffee":"CG","cortexin":"CG","d-serine":"CG","dihexa":"CG","l-tyrosine":"CG","n-acetyl-l-tyrosine":"CG","gotu-kola":"CG","magnesium-l-threonate":"CG","l-dopa":"CG","chinese-skullcap":"MS","honokiol":"MS","kanna":"MS","kanna-mesembrine-extract":"MS","dl-phenylalanine":"MS","lithium-orotate":"MS","esketamine":"MS","ketamine":"MS","gamma-aminobutyric-acid":"RC","chromium-iii-chloride":"MH","chromium-iii-picolinate":"MH","garcinia-cambogia":"MH","green-coffee-bean-extract":"MH","hoodia":"MH","p-synephrine":"MH","white-mulberry-leaf":"MH","dong-quai":"HH","wild-yam":"HH","yohimbe":"HH","yohimbine":"HH","leuprolide":"HH","turkesterone":"PF","ibutamoren":"PF","igf-1-lr3":"PF","mechano-growth-factor":"PF","peg-mgf":"PF","5-alpha-hydroxy-laxogenin":"PF","whey-protein":"PF","whey-protein-isolate":"PF","aged-garlic-extract":"HT","garlic":"HT","olive-leaf":"HT","monacolin-k":"HT","hydroxytyrosol":"HT","magnesium-taurate":"HT","aloe-vera":"DH","silymarin":"DH","triphala":"DH","oregano-oil":"DH","kpv":"DH","acai":"LG","black-seed":"LG","fulvic-acid":"LG","glucoraphanin":"LG","sulforaphane":"LG","indole-3-carbinol":"LG","s-acetyl-glutathione":"LG","n-acetyl-l-cysteine":"LG","mixed-tocopherols":"LG","epitalon":"LG","selenomethionine":"LG","noni":"LG","royal-jelly":"LG","gelatin":"JM","tb-500":"JM","thymosin-beta-4":"JM","retinol":"BS","retinyl-acetate":"BS","retinyl-palmitate":"BS","dexpanthenol":"BS"}'::jsonb)
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
