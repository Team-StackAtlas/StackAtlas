// Shared validation for research batches submitted through the StackAtlas
// research connector. Pure TypeScript with no runtime imports so it runs
// unchanged in the Deno Edge Function and in Vitest.
//
// Two kinds of checks live here, and the report keeps them apart:
//   - STRUCTURAL: shape, enums, required fields, references, limits.
//   - EDITORIAL: description/definition quality rules (length, circularity,
//     banned claim language, unexplained jargon, vague "traditional" wording).
// Neither is scientific verification. A batch that passes both is still only
// *staged*; a human approves it in Admin → Research.

export const BATCH_KIND = 'stackatlas-research-batch';
export const BATCH_SCHEMA_VERSION = 1;

export const LIMITS = {
  substances: 10,
  sources: 40,
  findings: 60,
  glossary: 20,
  descriptionMin: 60,
  descriptionMax: 600,
  definitionMin: 40,
  definitionMax: 320,
  detailMax: 1200,
} as const;

export const SOURCE_TYPES = [
  'human_study', 'review_or_meta_analysis', 'animal_study', 'in_vitro_or_mechanistic',
  'official_label_or_document', 'brand_or_vendor_document', 'coa_or_testing_document',
  'practitioner_source', 'community_or_influencer_mention', 'other',
] as const;
export const DIRECTIONS = ['increased', 'decreased', 'no_clear_change', 'mixed', 'unclear'] as const;
export const STUDY_TYPES = ['human_rct', 'human_observational', 'review', 'meta_analysis', 'animal', 'in_vitro', 'mechanistic', 'official_document', 'other'] as const;
export const DOSE_UNITS = ['mcg', 'mg', 'g', 'IU', 'mL', 'cc'] as const;

export interface SubstanceUpdate {
  slug: string;
  description?: string;
  /** Short note from the researcher on what changed and why; shown to the reviewer. */
  rationale?: string;
  /** Optional safe-language fields the importer already supports. */
  origin?: string;
  half_life?: string;
}

export interface SourceRow {
  title: string;
  source_type: (typeof SOURCE_TYPES)[number];
  pmid?: string;
  doi?: string;
  url?: string;
  year?: number;
  journal_or_site?: string;
  authors?: string;
  substances: string[];
  notes?: string;
}

export interface FindingRow {
  substance_slug: string;
  source_pmid?: string;
  source_doi?: string;
  source_url?: string;
  endpoint: string;
  direction: (typeof DIRECTIONS)[number];
  finding_summary: string;
  population?: string;
  dose_amount?: number;
  dose_unit?: (typeof DOSE_UNITS)[number];
  frequency?: string;
  duration?: string;
  study_type?: (typeof STUDY_TYPES)[number];
  limitations?: string;
}

export interface GlossaryRow {
  term: string;
  definition: string;
  category?: string;
  detail?: string;
  tags?: string[];
  bearings?: string[];
}

export interface ResearchBatch {
  kind: typeof BATCH_KIND;
  schema_version: typeof BATCH_SCHEMA_VERSION;
  /** Client-chosen key; the same key resubmitted returns the original report. */
  idempotency_key: string;
  label: string;
  generated_by?: string;
  /** True for connector smoke tests; such batches are never auto-published. */
  test?: boolean;
  substance_updates?: SubstanceUpdate[];
  sources?: SourceRow[];
  findings?: FindingRow[];
  glossary_terms?: GlossaryRow[];
}

export interface Issue {
  entity: 'batch' | 'substance_updates' | 'sources' | 'findings' | 'glossary_terms';
  index: number | null;
  path: string;
  severity: 'error' | 'warning';
  kind: 'structural' | 'editorial' | 'reference';
  message: string;
}

/** What the validator needs to know about the database to judge a batch. */
export interface ValidationContext {
  /** slug -> current record (name and description), for every slug the batch mentions. */
  substances: Map<string, { name: string; description: string | null }>;
  /** Natural keys of sources already in the database: 'p:<pmid>' | 'd:<doi>' | 'u:<url>'. */
  existingSourceKeys: Set<string>;
  /** Lower-cased glossary terms that exist, for the jargon check. */
  glossaryTerms: Set<string>;
  /** Lower-cased slugs of glossary terms, to tell new terms from updates. */
  glossarySlugs: Set<string>;
}

export interface ValidationReport {
  ok: boolean;
  issues: Issue[];
  counts: {
    substance_updates: { total: number; accepted: number; rejected: number };
    sources: { total: number; accepted: number; rejected: number; existing: number };
    findings: { total: number; accepted: number; rejected: number };
    glossary_terms: { total: number; accepted: number; rejected: number; existing: number };
  };
  /** Row indexes that passed; only these are staged. */
  accepted: { substance_updates: number[]; sources: number[]; findings: number[]; glossary_terms: number[] };
}

// ---------------------------------------------------------------------------
// Editorial rules
// ---------------------------------------------------------------------------

/** Words that assert efficacy or safety instead of describing. */
const CLAIM_WORDS = /\b(cures?|cured|curing|guaranteed?|miracle|proven|clinically proven|100%|no side effects|completely safe|totally safe|best|most effective|boosts? your|detox(?:es|ify|ifies)?)\b/i;
/** Jargon that must be defined in the glossary or explained inline when used. */
export const JARGON = [
  'mtor', 'ampk', 'nrf2', 'gaba', 'nmda', 'agonist', 'antagonist', 'bioavailability', 'half-life',
  'pharmacokinetic', 'pharmacodynamic', 'prodrug', 'secretagogue', 'aromatase', 'sarm', 'nootropic',
  'adaptogen', 'cytokine', 'oxidative stress', 'mitochondria', 'neurotransmitter', 'acetylcholine',
  'serotonin', 'dopamine', 'cortisol', 'insulin sensitivity', 'glycemic', 'hepatotoxic', 'nephrotoxic',
  'vasodilat', 'anabolic', 'androgen', 'estrogen', 'peptide', 'ligand', 'receptor', 'enzyme', 'metabolite',
];
const VAGUE_TRADITION = /\b(used in traditional medicine|traditionally used|folk remedy|ancient remedy|used for centuries)\b/i;

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** True when the first clause only restates the name ("Creatine monohydrate is a form of creatine…"). */
export function isCircular(description: string, name: string): boolean {
  const d = norm(description);
  const n = norm(name);
  if (!d || !n) return false;
  const firstClause = d.split(/[.;:]/)[0];
  if (/^(a|an|the)?\s*(form|type|kind|version|variant|salt|ester) of /.test(firstClause)) return true;
  if (firstClause.startsWith(n + ' is ') || firstClause.startsWith(n + ' are ')) {
    const rest = firstClause.slice(n.length + 4);
    // "X is a supplement" / "X is a compound" says nothing.
    if (/^(a|an)\s+(supplement|compound|substance|product|ingredient|molecule|chemical)\b/.test(rest) && rest.split(' ').length <= 5) return true;
  }
  // Every content word of the name appears in a very short first clause.
  const nameWords = n.split(' ').filter((w) => w.length > 2);
  const clauseWords = firstClause.split(' ');
  if (nameWords.length >= 2 && clauseWords.length <= 8 && nameWords.every((w) => clauseWords.includes(w))) return true;
  return false;
}

/** Jargon used in the text that is neither a glossary term nor explained inline (a parenthesis right after it). */
export function unexplainedJargon(text: string, glossaryTerms: Set<string>): string[] {
  const lower = text.toLowerCase();
  const hits: string[] = [];
  for (const term of JARGON) {
    const idx = lower.indexOf(term);
    if (idx < 0) continue;
    if (glossaryTerms.has(term) || [...glossaryTerms].some((g) => g.startsWith(term))) continue;
    // Explained inline: "mTOR (a growth-signalling pathway)" or "mTOR, a growth…"
    const after = lower.slice(idx + term.length, idx + term.length + 3);
    if (/^\s*[(,]/.test(after) || /^[a-z]*\s*[(,]/.test(after)) continue;
    hits.push(term);
  }
  return hits;
}

function similarity(a: string, b: string): number {
  // Jaccard over word trigrams; cheap and good enough to catch near-duplicates.
  const grams = (s: string) => {
    const w = norm(s).split(' ');
    const g = new Set<string>();
    for (let i = 0; i < w.length - 2; i++) g.add(w.slice(i, i + 3).join(' '));
    return g;
  };
  const A = grams(a); const B = grams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

export function editorialIssuesForDescription(text: string, name: string, existing: string | null, glossaryTerms: Set<string>): { severity: 'error' | 'warning'; message: string }[] {
  const out: { severity: 'error' | 'warning'; message: string }[] = [];
  const t = text.trim();
  if (t.length < LIMITS.descriptionMin) out.push({ severity: 'error', message: `description is too short (${t.length} chars; minimum ${LIMITS.descriptionMin})` });
  if (t.length > LIMITS.descriptionMax) out.push({ severity: 'error', message: `description is too long (${t.length} chars; maximum ${LIMITS.descriptionMax})` });
  if (isCircular(t, name)) out.push({ severity: 'error', message: 'description is circular: the first clause only restates the name or category' });
  const claim = t.match(CLAIM_WORDS);
  if (claim) out.push({ severity: 'error', message: `description asserts efficacy or safety ("${claim[0]}"); describe what is studied, not what is promised` });
  const vague = t.match(VAGUE_TRADITION);
  if (vague && !/\b(for|to treat|against|as a)\b/i.test(t.slice((vague.index ?? 0) + vague[0].length, (vague.index ?? 0) + vague[0].length + 40))) {
    out.push({ severity: 'error', message: `"${vague[0]}" without saying what for; name the use` });
  }
  const jargon = unexplainedJargon(t, glossaryTerms);
  if (jargon.length) out.push({ severity: 'warning', message: `unexplained jargon: ${jargon.join(', ')} (add a glossary term in this batch or explain inline)` });
  if (existing) {
    const sim = similarity(t, existing);
    if (sim > 0.9) out.push({ severity: 'error', message: 'description is nearly identical to the current one; nothing to review' });
    if (t.length < existing.length * 0.6 && !isCircular(existing, name)) {
      out.push({ severity: 'warning', message: `proposed description is much shorter than the current one (${t.length} vs ${existing.length} chars); reviewer should confirm it is better, not just shorter` });
    }
  }
  return out;
}

export function editorialIssuesForDefinition(term: string, definition: string, detail: string | undefined, glossaryTerms: Set<string>): { severity: 'error' | 'warning'; message: string }[] {
  const out: { severity: 'error' | 'warning'; message: string }[] = [];
  const d = definition.trim();
  if (d.length < LIMITS.definitionMin) out.push({ severity: 'error', message: `definition is too short (${d.length}; minimum ${LIMITS.definitionMin})` });
  if (d.length > LIMITS.definitionMax) out.push({ severity: 'error', message: `definition is too long (${d.length}; maximum ${LIMITS.definitionMax}); move depth into detail` });
  if (isCircular(d, term)) out.push({ severity: 'error', message: 'definition is circular: it restates the term instead of defining it' });
  if (CLAIM_WORDS.test(d)) out.push({ severity: 'error', message: 'definition asserts efficacy or safety' });
  if (detail && detail.length > LIMITS.detailMax) out.push({ severity: 'error', message: `detail is too long (maximum ${LIMITS.detailMax})` });
  const jargon = unexplainedJargon(d, glossaryTerms).filter((j) => !norm(term).includes(j));
  if (jargon.length) out.push({ severity: 'warning', message: `definition uses unexplained jargon: ${jargon.join(', ')}` });
  return out;
}

// ---------------------------------------------------------------------------
// Structural validation
// ---------------------------------------------------------------------------

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const isPlainObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function sourceKeys(row: { pmid?: string; doi?: string; url?: string }): string[] {
  const k: string[] = [];
  if (str(row.pmid)) k.push(`p:${str(row.pmid).toLowerCase()}`);
  if (str(row.doi)) k.push(`d:${str(row.doi).toLowerCase()}`);
  if (str(row.url)) k.push(`u:${str(row.url)}`);
  return k;
}

export function validateResearchBatch(input: unknown, ctx: ValidationContext): ValidationReport {
  const issues: Issue[] = [];
  const push = (i: Omit<Issue, 'severity' | 'kind'> & Partial<Pick<Issue, 'severity' | 'kind'>>) =>
    issues.push({ severity: 'error', kind: 'structural', ...i });

  const accepted = { substance_updates: [] as number[], sources: [] as number[], findings: [] as number[], glossary_terms: [] as number[] };
  const counts = {
    substance_updates: { total: 0, accepted: 0, rejected: 0 },
    sources: { total: 0, accepted: 0, rejected: 0, existing: 0 },
    findings: { total: 0, accepted: 0, rejected: 0 },
    glossary_terms: { total: 0, accepted: 0, rejected: 0, existing: 0 },
  };
  const fail = (): ValidationReport => ({ ok: false, issues, counts, accepted });

  if (!isPlainObject(input)) { push({ entity: 'batch', index: null, path: '', message: 'batch must be a JSON object' }); return fail(); }
  const b = input as Record<string, unknown>;
  if (b.kind !== BATCH_KIND) push({ entity: 'batch', index: null, path: 'kind', message: `kind must be "${BATCH_KIND}"` });
  if (b.schema_version !== BATCH_SCHEMA_VERSION) push({ entity: 'batch', index: null, path: 'schema_version', message: `schema_version must be ${BATCH_SCHEMA_VERSION}` });
  if (!str(b.idempotency_key) || str(b.idempotency_key).length > 120) push({ entity: 'batch', index: null, path: 'idempotency_key', message: 'idempotency_key is required (1–120 chars); reuse it to resubmit the same batch safely' });
  if (!str(b.label) || str(b.label).length > 140) push({ entity: 'batch', index: null, path: 'label', message: 'label is required (1–140 chars)' });
  for (const [key, max] of [['substance_updates', LIMITS.substances], ['sources', LIMITS.sources], ['findings', LIMITS.findings], ['glossary_terms', LIMITS.glossary]] as const) {
    const v = b[key];
    if (v !== undefined && !Array.isArray(v)) push({ entity: key, index: null, path: key, message: `${key} must be an array` });
    if (Array.isArray(v) && v.length > max) push({ entity: key, index: null, path: key, message: `${key} has ${v.length} rows; the limit is ${max} per batch` });
  }
  const total = (['substance_updates', 'sources', 'findings', 'glossary_terms'] as const).reduce((n, k) => n + (Array.isArray(b[k]) ? (b[k] as unknown[]).length : 0), 0);
  if (total === 0) push({ entity: 'batch', index: null, path: '', message: 'batch is empty' });
  if (issues.some((i) => i.severity === 'error')) return fail();

  // --- sources ---
  const batchSourceKeys = new Set<string>();
  const sources = (b.sources ?? []) as unknown[];
  sources.forEach((raw, i) => {
    counts.sources.total++;
    const errs: string[] = [];
    if (!isPlainObject(raw)) { push({ entity: 'sources', index: i, path: '', message: 'source must be an object' }); counts.sources.rejected++; return; }
    const r = raw as Record<string, unknown>;
    if (!str(r.title)) errs.push('title is required');
    if (!SOURCE_TYPES.includes(str(r.source_type) as never)) errs.push(`invalid source_type: ${str(r.source_type) || '(missing)'}`);
    const keys = sourceKeys(r as unknown as SourceRow);
    if (keys.length === 0) errs.push('a source needs at least one identifier: pmid, doi, or url');
    if (str(r.pmid) && !/^\d{1,9}$/.test(str(r.pmid))) errs.push('pmid must be digits only');
    if (str(r.doi) && !/^10\.\d{4,9}\/\S+$/i.test(str(r.doi))) errs.push('doi must look like 10.xxxx/…');
    if (r.year !== undefined && !(Number.isInteger(r.year) && (r.year as number) >= 1900 && (r.year as number) <= new Date().getFullYear() + 1)) errs.push('year must be a four-digit year');
    const subs = Array.isArray(r.substances) ? (r.substances as unknown[]).map(str).filter(Boolean) : [];
    if (subs.length === 0) errs.push('substances must list at least one substance slug this source is about');
    for (const s of subs) if (!ctx.substances.has(s)) errs.push(`unknown substance slug: ${s} (sources may only be linked to existing substances)`);
    if (keys.some((k) => batchSourceKeys.has(k))) errs.push('duplicate source within the batch');
    for (const e of errs) push({ entity: 'sources', index: i, path: '', message: e });
    if (errs.length) { counts.sources.rejected++; return; }
    keys.forEach((k) => batchSourceKeys.add(k));
    if (keys.some((k) => ctx.existingSourceKeys.has(k))) counts.sources.existing++;
    counts.sources.accepted++; accepted.sources.push(i);
  });

  // --- findings ---
  const findings = (b.findings ?? []) as unknown[];
  const findingKeys = new Set<string>();
  findings.forEach((raw, i) => {
    counts.findings.total++;
    const errs: string[] = [];
    if (!isPlainObject(raw)) { push({ entity: 'findings', index: i, path: '', message: 'finding must be an object' }); counts.findings.rejected++; return; }
    const r = raw as Record<string, unknown>;
    const slug = str(r.substance_slug);
    if (!slug) errs.push('substance_slug is required');
    else if (!ctx.substances.has(slug)) errs.push(`unknown substance slug: ${slug}`);
    const refs = sourceKeys({ pmid: str(r.source_pmid), doi: str(r.source_doi), url: str(r.source_url) });
    if (refs.length === 0) errs.push('finding must reference its source by source_pmid, source_doi, or source_url');
    else if (!refs.some((k) => batchSourceKeys.has(k) || ctx.existingSourceKeys.has(k))) {
      issues.push({ entity: 'findings', index: i, path: 'source', severity: 'error', kind: 'reference', message: 'finding references a source that is neither in this batch nor in the database' });
    }
    if (!str(r.endpoint)) errs.push('endpoint is required (what was measured)');
    if (!DIRECTIONS.includes(str(r.direction) as never)) errs.push(`invalid direction: ${str(r.direction) || '(missing)'}`);
    const summary = str(r.finding_summary);
    if (summary.length < 30) errs.push('finding_summary must be at least 30 characters and say what the source found');
    if (CLAIM_WORDS.test(summary)) issues.push({ entity: 'findings', index: i, path: 'finding_summary', severity: 'error', kind: 'editorial', message: 'finding_summary asserts efficacy or safety; report the measured result' });
    if (r.study_type !== undefined && !STUDY_TYPES.includes(str(r.study_type) as never)) errs.push(`invalid study_type: ${str(r.study_type)}`);
    if (r.dose_unit !== undefined && !DOSE_UNITS.includes(str(r.dose_unit) as never)) errs.push(`invalid dose_unit: ${str(r.dose_unit)}`);
    if (r.dose_amount !== undefined && !(typeof r.dose_amount === 'number' && r.dose_amount > 0)) errs.push('dose_amount must be a positive number');
    const key = `${slug}|${refs.join(',')}|${str(r.endpoint).toLowerCase()}|${str(r.direction)}`;
    if (findingKeys.has(key)) errs.push('duplicate finding within the batch');
    for (const e of errs) push({ entity: 'findings', index: i, path: '', message: e });
    const rowErrors = issues.filter((x) => x.entity === 'findings' && x.index === i && x.severity === 'error').length;
    if (rowErrors) { counts.findings.rejected++; return; }
    findingKeys.add(key);
    counts.findings.accepted++; accepted.findings.push(i);
  });

  // --- substance updates ---
  const updates = (b.substance_updates ?? []) as unknown[];
  const seenSlugs = new Set<string>();
  updates.forEach((raw, i) => {
    counts.substance_updates.total++;
    if (!isPlainObject(raw)) { push({ entity: 'substance_updates', index: i, path: '', message: 'substance update must be an object' }); counts.substance_updates.rejected++; return; }
    const r = raw as Record<string, unknown>;
    const slug = str(r.slug);
    const existing = ctx.substances.get(slug);
    if (!slug) push({ entity: 'substance_updates', index: i, path: 'slug', message: 'slug is required' });
    else if (!existing) push({ entity: 'substance_updates', index: i, path: 'slug', message: `unknown substance slug: ${slug}; the connector never creates substances` });
    if (seenSlugs.has(slug)) push({ entity: 'substance_updates', index: i, path: 'slug', message: 'duplicate substance update within the batch' });
    seenSlugs.add(slug);
    const desc = str(r.description);
    if (!desc && !str(r.origin) && !str(r.half_life)) push({ entity: 'substance_updates', index: i, path: '', message: 'an update must propose at least a description, origin, or half_life' });
    if (desc && existing) {
      for (const e of editorialIssuesForDescription(desc, existing.name, existing.description, ctx.glossaryTerms)) {
        issues.push({ entity: 'substance_updates', index: i, path: 'description', severity: e.severity, kind: 'editorial', message: e.message });
      }
      // A description change must be backed by something in this batch or the database.
      const backed = sources.some((s, si) => accepted.sources.includes(si) && Array.isArray((s as SourceRow).substances) && (s as SourceRow).substances.includes(slug));
      if (!backed) issues.push({ entity: 'substance_updates', index: i, path: 'description', severity: 'warning', kind: 'reference', message: 'no source in this batch is linked to this substance; the reviewer will ask what the description is based on' });
    }
    const rowErrors = issues.filter((x) => x.entity === 'substance_updates' && x.index === i && x.severity === 'error').length;
    if (rowErrors) { counts.substance_updates.rejected++; return; }
    counts.substance_updates.accepted++; accepted.substance_updates.push(i);
  });

  // --- glossary terms ---
  const glossary = (b.glossary_terms ?? []) as unknown[];
  const seenTerms = new Set<string>();
  glossary.forEach((raw, i) => {
    counts.glossary_terms.total++;
    if (!isPlainObject(raw)) { push({ entity: 'glossary_terms', index: i, path: '', message: 'glossary term must be an object' }); counts.glossary_terms.rejected++; return; }
    const r = raw as Record<string, unknown>;
    const term = str(r.term);
    if (!term || term.length > 80) push({ entity: 'glossary_terms', index: i, path: 'term', message: 'term is required (max 80 chars)' });
    const key = term.toLowerCase();
    if (seenTerms.has(key)) push({ entity: 'glossary_terms', index: i, path: 'term', message: 'duplicate term within the batch' });
    seenTerms.add(key);
    const def = str(r.definition);
    if (!def) push({ entity: 'glossary_terms', index: i, path: 'definition', message: 'definition is required' });
    else for (const e of editorialIssuesForDefinition(term, def, str(r.detail) || undefined, ctx.glossaryTerms)) {
      issues.push({ entity: 'glossary_terms', index: i, path: 'definition', severity: e.severity, kind: 'editorial', message: e.message });
    }
    if (r.bearings !== undefined && (!Array.isArray(r.bearings) || (r.bearings as unknown[]).length > 5)) push({ entity: 'glossary_terms', index: i, path: 'bearings', message: 'bearings must be an array of at most 5' });
    if (r.tags !== undefined && !Array.isArray(r.tags)) push({ entity: 'glossary_terms', index: i, path: 'tags', message: 'tags must be an array' });
    const slug = key.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (ctx.glossarySlugs.has(slug) || ctx.glossaryTerms.has(key)) counts.glossary_terms.existing++;
    const rowErrors = issues.filter((x) => x.entity === 'glossary_terms' && x.index === i && x.severity === 'error').length;
    if (rowErrors) { counts.glossary_terms.rejected++; return; }
    counts.glossary_terms.accepted++; accepted.glossary_terms.push(i);
  });

  const anyAccepted = accepted.substance_updates.length + accepted.sources.length + accepted.findings.length + accepted.glossary_terms.length > 0;
  return { ok: anyAccepted && !issues.some((i) => i.entity === 'batch' && i.severity === 'error'), issues, counts, accepted };
}
