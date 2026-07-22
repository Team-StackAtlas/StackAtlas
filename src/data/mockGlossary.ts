import type { GlossaryTerm } from '../services/glossary';

const SEEDED_AT = '2026-07-22T00:00:00Z';

function term(slug: string, name: string, category: string, definition: string): GlossaryTerm {
  return { id: `mock-${slug}`, term: name, slug, definition, category, createdAt: SEEDED_AT, updatedAt: SEEDED_AT };
}

/** Seed glossary used when no backend is configured, so the Glossary page and
 * inline term-linking still work in demos and local development. */
export const MOCK_GLOSSARY_TERMS: GlossaryTerm[] = [
  term('half-life', 'Half-Life', 'Pharmacology', 'The time it takes for the amount of a substance in the body to drop by half. A short half-life means effects fade quickly; a long one means the substance accumulates with repeated doses.'),
  term('bioavailability', 'Bioavailability', 'Pharmacology', 'The fraction of a dose that actually reaches circulation. Two products with the same label dose can deliver very different amounts depending on form and formulation.'),
  term('tolerance', 'Tolerance', 'Pharmacology', 'A reduced response to the same dose after repeated use. Substances that build tolerance quickly are often cycled to keep them effective.'),
  term('cycle', 'Cycle', 'Practice', 'A planned period of use followed by a break. Cycling is used to limit tolerance buildup and give the body time to return to baseline.'),
  term('titration', 'Titration', 'Practice', 'Starting at a low dose and increasing gradually until the desired effect is reached. Reduces the risk of side effects from starting too high.'),
  term('stack', 'Stack', 'Practice', 'A combination of substances taken together for a shared goal, such as pairing caffeine with L-theanine for focus without jitters.'),
  term('nootropic', 'Nootropic', 'Categories', 'A substance used to support cognitive function — memory, focus, clarity, or motivation. Evidence quality varies widely across the category.'),
  term('adaptogen', 'Adaptogen', 'Categories', 'A herb or compound traditionally used to help the body handle stress, such as ashwagandha or rhodiola. The term comes from herbal practice, not a regulatory definition.'),
  term('peptide', 'Peptide', 'Categories', 'A short chain of amino acids. Research peptides such as BPC-157 are studied for recovery and repair, and most have limited human evidence.'),
  term('rct', 'RCT', 'Research', 'A randomized controlled trial — participants are randomly assigned to receive the treatment or a control. The strongest single-study design for testing whether something works.'),
  term('meta-analysis', 'Meta-Analysis', 'Research', 'A study that pools the results of many trials into one estimate. Stronger than any single trial when the included studies are good quality.'),
  term('placebo', 'Placebo', 'Research', 'An inactive treatment used as a comparison. Improvements from expectation alone are the placebo effect, which is why controlled comparisons matter.'),
  term('anecdotal-evidence', 'Anecdotal Evidence', 'Research', 'Individual reports of experiences, like the Dispatches on StackAtlas. Useful for spotting patterns and side effects, but not proof that an effect is real.'),
  term('third-party-testing', 'Third-Party Testing', 'Quality & Testing', 'Independent lab verification of what a product contains — identity, potency, and contaminants — rather than relying on the manufacturer’s own claims.'),
  term('coa', 'COA', 'Quality & Testing', 'A Certificate of Analysis: the lab document reporting what a specific product batch was tested for and what was found.'),
  term('contamination-report', 'Contamination Report', 'Quality & Testing', 'A record that a product batch was found to contain something it should not — heavy metals, unlisted actives, or impurities.'),
];
