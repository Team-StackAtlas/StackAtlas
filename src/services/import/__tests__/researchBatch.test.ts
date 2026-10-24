import { describe, expect, it } from 'vitest';
import {
  BATCH_KIND, BATCH_SCHEMA_VERSION, isCircular, unexplainedJargon, validateResearchBatch,
  type ValidationContext,
} from '../../../../supabase/functions/_shared/researchBatch';

function ctx(over: Partial<ValidationContext> = {}): ValidationContext {
  return {
    substances: new Map([
      ['creatine-monohydrate', { name: 'Creatine Monohydrate', description: 'A form of creatine extensively studied for its role in muscle energy metabolism and exercise performance.' }],
      ['rapamycin', { name: 'Rapamycin', description: 'An mTOR inhibitor used clinically as an immunosuppressant and investigated for its effects on aging.' }],
    ]),
    existingSourceKeys: new Set(['p:12345678']),
    glossaryTerms: new Set(['half-life', 'bioavailability']),
    glossarySlugs: new Set(['half-life', 'bioavailability']),
    ...over,
  };
}

const GOOD_DESC = 'Creatine monohydrate is the most studied form of a compound your muscles use to regenerate ATP, the molecule that powers short bursts of effort. Supplementing raises muscle creatine stores, and controlled trials in adults consistently report small gains in strength and sprint performance; long-term safety data in healthy adults is reassuring.';

type Loose = Record<string, unknown>;
const base = (): Loose & { sources: Loose[]; substance_updates: Loose[]; findings?: Loose[]; glossary_terms?: Loose[] } => ({
  kind: BATCH_KIND,
  schema_version: BATCH_SCHEMA_VERSION,
  idempotency_key: 'test-1',
  label: 'Test batch',
  sources: [{ title: 'Creatine supplementation and exercise performance: a meta-analysis', source_type: 'review_or_meta_analysis', pmid: '12345678', year: 2017, substances: ['creatine-monohydrate'] }],
  substance_updates: [{ slug: 'creatine-monohydrate', description: GOOD_DESC }],
});

describe('isCircular', () => {
  it('flags "a form of X" openers and category restatements', () => {
    expect(isCircular('A form of creatine extensively studied for muscle energy.', 'Creatine Monohydrate')).toBe(true);
    expect(isCircular('Creatine Monohydrate is a supplement.', 'Creatine Monohydrate')).toBe(true);
    expect(isCircular(GOOD_DESC, 'Creatine Monohydrate')).toBe(false);
  });
});

describe('unexplainedJargon', () => {
  it('passes jargon that is in the glossary or explained inline', () => {
    expect(unexplainedJargon('An mTOR inhibitor used clinically.', new Set())).toEqual(['mtor']);
    expect(unexplainedJargon('It blocks mTOR (a growth-signalling switch in cells).', new Set())).toEqual([]);
    expect(unexplainedJargon('Its half-life is long.', new Set(['half-life']))).toEqual([]);
  });
});

describe('validateResearchBatch', () => {
  it('accepts a well-formed batch', () => {
    const r = validateResearchBatch(base(), ctx());
    expect(r.ok).toBe(true);
    expect(r.accepted.sources).toEqual([0]);
    expect(r.accepted.substance_updates).toEqual([0]);
    expect(r.issues.filter((i) => i.severity === 'error')).toEqual([]);
  });

  it('rejects malformed envelopes without staging anything', () => {
    const r = validateResearchBatch({ kind: 'nope' }, ctx());
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.path === 'kind')).toBe(true);
    expect(r.issues.some((i) => i.path === 'idempotency_key')).toBe(true);
  });

  it('never creates substances: unknown slugs are rejected everywhere', () => {
    const b = base();
    b.substance_updates = [{ slug: 'made-up', description: GOOD_DESC }];
    b.sources[0] = { ...b.sources[0], substances: ['made-up'] };
    const r = validateResearchBatch(b, ctx());
    expect(r.counts.substance_updates.rejected).toBe(1);
    expect(r.counts.sources.rejected).toBe(1);
  });

  it('rejects circular, claim-laden, and near-identical descriptions', () => {
    const b = base();
    b.substance_updates = [{ slug: 'creatine-monohydrate', description: 'A form of creatine extensively studied for its role in muscle energy metabolism and exercise performance.' }];
    const r = validateResearchBatch(b, ctx());
    const msgs = r.issues.filter((i) => i.entity === 'substance_updates').map((i) => i.message).join(' | ');
    expect(msgs).toMatch(/circular/);
    expect(msgs).toMatch(/nearly identical/);
    expect(r.counts.substance_updates.rejected).toBe(1);

    const c = base();
    c.substance_updates = [{ slug: 'rapamycin', description: 'Rapamycin is a clinically proven anti-aging drug that cures inflammation and boosts your mitochondria, with no side effects reported across decades of use in people.' }];
    expect(validateResearchBatch(c, ctx()).issues.some((i) => /efficacy or safety/.test(i.message))).toBe(true);
  });

  it('warns when a proposal would shorten a healthy existing description', () => {
    const good = ctx({ substances: new Map([['creatine-monohydrate', { name: 'Creatine Monohydrate', description: GOOD_DESC }]]) });
    const b = base();
    b.substance_updates = [{ slug: 'creatine-monohydrate', description: 'Creatine monohydrate helps muscles regenerate ATP for short bursts of effort and raises stored creatine.' }];
    const r = validateResearchBatch(b, good);
    expect(r.issues.some((i) => /much shorter/.test(i.message))).toBe(true);
  });

  it('rejects findings whose source is neither in the batch nor the database', () => {
    const b = base();
    b.findings = [{ substance_slug: 'creatine-monohydrate', source_pmid: '99999999', endpoint: 'strength', direction: 'increased', finding_summary: 'Pooled trials reported higher one-rep max versus placebo.' }];
    const r = validateResearchBatch(b, ctx());
    expect(r.counts.findings.rejected).toBe(1);
    expect(r.issues.some((i) => i.kind === 'reference')).toBe(true);
  });

  it('flags duplicates inside a batch and enforces row limits', () => {
    const b = base();
    b.sources = [b.sources[0], { ...b.sources[0] }];
    const r = validateResearchBatch(b, ctx());
    expect(r.issues.some((i) => /duplicate source/.test(i.message))).toBe(true);
    const big = base();
    big.sources = Array.from({ length: 41 }, (_, i) => ({ ...base().sources[0], pmid: String(10000000 + i) }));
    expect(validateResearchBatch(big, ctx()).issues.some((i) => /limit is 40/.test(i.message))).toBe(true);
  });

  it('requires glossary definitions to define, not restate', () => {
    const b = base();
    b.glossary_terms = [
      { term: 'Daily Intake', definition: 'The amount taken daily.' },
      { term: 'mTOR', definition: 'A protein complex inside cells that acts like a growth switch: when nutrients and growth signals are high it turns on protein building, and when they are low it turns on recycling.' },
    ];
    const r = validateResearchBatch(b, ctx());
    expect(r.counts.glossary_terms.rejected).toBe(1);
    expect(r.counts.glossary_terms.accepted).toBe(1);
  });
});
