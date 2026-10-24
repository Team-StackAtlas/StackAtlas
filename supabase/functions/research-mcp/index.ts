// StackAtlas research connector: a small, restricted MCP server for regular
// Claude (claude.ai custom connector). Three tools, nothing else:
//   get_research_queue      what needs work, by rules on existing fields
//   get_substance_context   what we already know about given substances
//   submit_research_batch   validate + stage a batch for admin review
//
// Auth: Supabase Auth OAuth 2.1 (the project is the authorization server).
// Every request carries a Supabase-issued user JWT; we verify it, require the
// user to be site_admin or site_owner, and then act *as that user* through a
// user-scoped client, so the existing owner-gated RPCs and RLS do all the
// permission work. No service-role key is used anywhere in this function.
//
// Nothing here is scientific verification. PMID checks confirm a paper
// exists and roughly matches the supplied title/year; they do not confirm
// the paper supports any claim. Everything submitted waits for a human.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { McpServer } from 'npm:@modelcontextprotocol/sdk@1.25.3/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from 'npm:@modelcontextprotocol/sdk@1.25.3/server/webStandardStreamableHttp.js';
import { Hono } from 'npm:hono@4.9.7';
import { z } from 'npm:zod@4.1.13';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  BATCH_KIND, BATCH_SCHEMA_VERSION, LIMITS, sourceKeys, validateResearchBatch,
  type ResearchBatch, type SourceRow, type FindingRow, type ValidationContext, type Issue,
} from '../_shared/researchBatch.ts';

const FUNCTION_NAME = 'research-mcp';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const RESOURCE_URL = `${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`;
const AUTH_SERVER = `${SUPABASE_URL}/auth/v1`;
const NCBI_TIMEOUT_MS = 8000;

type Json = Record<string, unknown>;
const text = (payload: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }] });

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

interface Caller { userId: string; role: string; client: SupabaseClient }

async function authenticate(req: Request): Promise<Caller | Response> {
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const challenge = (error: string, description: string, status = 401) =>
    new Response(JSON.stringify({ error, error_description: description }), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': `Bearer resource_metadata="${RESOURCE_URL}/.well-known/oauth-protected-resource", error="${error}", error_description="${description}"`,
      },
    });
  if (!token) return challenge('invalid_token', 'Sign in to StackAtlas through the connector first.');

  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await anon.auth.getClaims(token);
  if (error || !data?.claims?.sub) return challenge('invalid_token', 'The access token is invalid or expired.');
  const userId = String(data.claims.sub);

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: profile, error: pErr } = await client.from('profiles').select('site_role').eq('id', userId).maybeSingle();
  if (pErr) return challenge('server_error', `Could not load profile: ${pErr.message}`, 500);
  const role = (profile?.site_role as string | undefined) ?? 'user';
  if (role !== 'site_owner' && role !== 'site_admin') {
    return challenge('insufficient_scope', 'This StackAtlas account is not an administrator.', 403);
  }
  return { userId, role, client };
}

// ---------------------------------------------------------------------------
// Context loading
// ---------------------------------------------------------------------------

async function loadContext(client: SupabaseClient, slugs: string[]): Promise<ValidationContext> {
  const unique = [...new Set(slugs.filter(Boolean))];
  const substances = new Map<string, { name: string; description: string | null }>();
  if (unique.length) {
    const { data, error } = await client.from('substances').select('slug, name, description').in('slug', unique);
    if (error) throw new Error(`substances lookup failed: ${error.message}`);
    for (const r of data ?? []) substances.set(r.slug, { name: r.name, description: r.description });
    // Aliases resolve too (the importer does the same server-side).
    const missing = unique.filter((s) => !substances.has(s));
    if (missing.length) {
      const { data: al } = await client.from('substance_aliases').select('alias, substances(slug, name, description)').in('alias', missing);
      for (const r of (al ?? []) as unknown as { alias: string; substances: { slug: string; name: string; description: string | null } | null }[]) {
        if (r.substances) substances.set(r.alias, { name: r.substances.name, description: r.substances.description });
      }
    }
  }
  const { data: src, error: sErr } = await client.from('research_sources').select('pmid, doi, url');
  if (sErr) throw new Error(`sources lookup failed: ${sErr.message}`);
  const existingSourceKeys = new Set<string>();
  for (const r of src ?? []) sourceKeys(r as { pmid?: string; doi?: string; url?: string }).forEach((k) => existingSourceKeys.add(k));
  const { data: gl } = await client.from('glossary_terms').select('term, slug');
  const glossaryTerms = new Set<string>((gl ?? []).map((g) => String(g.term).toLowerCase()));
  const glossarySlugs = new Set<string>((gl ?? []).map((g) => String(g.slug).toLowerCase()));
  return { substances, existingSourceKeys, glossaryTerms, glossarySlugs };
}

// ---------------------------------------------------------------------------
// PMID metadata check (bibliographic only)
// ---------------------------------------------------------------------------

interface PmidCheck { pmid: string; status: 'match' | 'mismatch' | 'not_found' | 'unverified'; detail: string }

function titleOverlap(a: string, b: string): number {
  const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 3));
  const A = words(a); const B = words(b);
  if (!A.size || !B.size) return 0;
  let n = 0; for (const w of A) if (B.has(w)) n++;
  return n / Math.min(A.size, B.size);
}

async function checkPmids(sources: SourceRow[]): Promise<PmidCheck[]> {
  const withPmid = sources.filter((s) => s.pmid);
  if (!withPmid.length) return [];
  const ids = [...new Set(withPmid.map((s) => s.pmid!))];
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), NCBI_TIMEOUT_MS);
  try {
    const res = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(',')}`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`NCBI ${res.status}`);
    const json = await res.json() as { result?: Record<string, { title?: string; pubdate?: string; error?: string }> };
    return withPmid.map((s) => {
      const rec = json.result?.[s.pmid!];
      if (!rec || rec.error) return { pmid: s.pmid!, status: 'not_found', detail: 'PubMed has no record with this ID' };
      const year = Number((rec.pubdate ?? '').slice(0, 4));
      const overlap = titleOverlap(rec.title ?? '', s.title);
      const yearOk = !s.year || !year || Math.abs(year - s.year) <= 1;
      if (overlap >= 0.5 && yearOk) return { pmid: s.pmid!, status: 'match', detail: `PubMed title: ${rec.title}` };
      return { pmid: s.pmid!, status: 'mismatch', detail: `PubMed says "${rec.title}" (${rec.pubdate}); batch says "${s.title}" (${s.year ?? 'no year'})` };
    });
  } catch (err) {
    return withPmid.map((s) => ({ pmid: s.pmid!, status: 'unverified', detail: `NCBI lookup failed: ${err instanceof Error ? err.message : String(err)}` }));
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

function buildServer(caller: Caller): McpServer {
  const { client } = caller;
  const server = new McpServer({ name: 'stackatlas-research', version: '0.1.0' });

  server.registerTool(
    'get_research_queue',
    {
      title: 'Research queue',
      description: 'Substances that most need better descriptions or evidence, ranked by rules on existing fields (short or circular description, no linked sources, no findings). Substances with a submission already waiting for review are listed separately so you do not redo them.',
      inputSchema: {
        limit: z.number().int().min(1).max(50).default(20),
        classification: z.enum(['Everyday', 'Clinical', 'Frontier', 'Unknown']).optional(),
      },
    },
    async ({ limit, classification }) => {
      const { data, error } = await client.rpc('research_queue', { p_limit: limit, p_classification: classification ?? null });
      if (error) throw new Error(error.message);
      const { data: pending } = await client.from('research_submissions').select('label, substance_slugs, status, created_at').eq('status', 'needs_review');
      const inReview = new Set<string>((pending ?? []).flatMap((p) => (p.substance_slugs as string[]) ?? []));
      const rows = (data ?? []) as Json[];
      return text({
        queue: rows.filter((r) => !inReview.has(String(r.slug))),
        already_in_review: rows.filter((r) => inReview.has(String(r.slug))).map((r) => r.slug),
        how_to_read: 'score 6+ means both description and evidence are weak. Pick 3–8 at a time, call get_substance_context on them, research, then submit_research_batch.',
      });
    },
  );

  server.registerTool(
    'get_substance_context',
    {
      title: 'Substance context',
      description: 'Everything StackAtlas already has for up to 10 substances: current description, classification, risk level, routes, aliases, linked sources, findings, glossary terms its description uses, and pending submissions. Use it before researching so you extend what exists instead of duplicating it.',
      inputSchema: { slugs: z.array(z.string().min(1)).min(1).max(10) },
    },
    async ({ slugs }) => {
      const { data: subs, error } = await client
        .from('substances')
        .select('id, slug, name, classification, risk_level, description, origin, half_life, average_dosage, substance_aliases(alias), substance_routes(category_routes(category))')
        .in('slug', slugs);
      if (error) throw new Error(error.message);
      const found = (subs ?? []) as unknown as Json[];
      const ids = found.map((s) => s.id as string);
      const [links, findings, glossary, pending] = await Promise.all([
        ids.length ? client.from('research_source_substances').select('substance_id, research_sources(title, pmid, doi, url, year, source_type, review_status)').in('substance_id', ids) : Promise.resolve({ data: [] as unknown[] }),
        ids.length ? client.from('research_findings').select('substance_id, endpoint, direction, finding_summary, study_type, population, review_status, research_sources(pmid, doi, title)').in('substance_id', ids).neq('review_status', 'rejected') : Promise.resolve({ data: [] as unknown[] }),
        client.from('glossary_terms').select('term, slug, definition'),
        client.from('research_submissions').select('label, status, created_at, substance_slugs').in('status', ['needs_review', 'published']).overlaps('substance_slugs', slugs),
      ]);
      const glossaryRows = (glossary.data ?? []) as { term: string; slug: string; definition: string }[];
      const out = found.map((s) => {
        const desc = String(s.description ?? '');
        const lower = desc.toLowerCase();
        return {
          slug: s.slug,
          name: s.name,
          classification: s.classification,
          risk_level: s.risk_level,
          description: desc,
          description_length: desc.length,
          origin: s.origin,
          half_life: s.half_life,
          reported_dose_range: s.average_dosage,
          aliases: ((s.substance_aliases as { alias: string }[]) ?? []).map((a) => a.alias),
          categories: ((s.substance_routes as { category_routes: { category: string } | null }[]) ?? []).map((r) => r.category_routes?.category).filter(Boolean),
          sources: ((links.data ?? []) as Json[]).filter((l) => l.substance_id === s.id).map((l) => l.research_sources),
          findings: ((findings.data ?? []) as Json[]).filter((f) => f.substance_id === s.id).map(({ substance_id: _omit, ...rest }) => rest),
          glossary_terms_used: glossaryRows.filter((g) => lower.includes(g.term.toLowerCase())).map((g) => g.term),
          submissions: ((pending.data ?? []) as Json[]).filter((p) => ((p.substance_slugs as string[]) ?? []).includes(String(s.slug))).map(({ substance_slugs: _omit, ...rest }) => rest),
        };
      });
      const unknown = slugs.filter((s) => !found.some((f) => f.slug === s));
      return text({ substances: out, unknown_slugs: unknown, note: unknown.length ? 'Unknown slugs cannot be researched: the connector never creates substances. Check spelling or ask the owner to add the substance first.' : undefined });
    },
  );

  server.registerTool(
    'submit_research_batch',
    {
      title: 'Submit research batch',
      description: `Validate and stage one research batch for admin review. Limits per batch: ${LIMITS.substances} substance updates, ${LIMITS.sources} sources, ${LIMITS.findings} findings, ${LIMITS.glossary} glossary terms. Nothing is published by this call: sources and findings are staged, description and glossary proposals wait for approval. Reuse the same idempotency_key to resubmit a corrected batch only after the owner has rejected the first; a key already accepted returns the original report. Read the report and fix rejected rows in a new batch with a new key.`,
      inputSchema: {
        batch: z.object({
          kind: z.literal(BATCH_KIND),
          schema_version: z.literal(BATCH_SCHEMA_VERSION),
          idempotency_key: z.string().min(1).max(120),
          label: z.string().min(1).max(140),
          generated_by: z.string().max(120).optional(),
          test: z.boolean().optional(),
          substance_updates: z.array(z.record(z.string(), z.unknown())).optional(),
          sources: z.array(z.record(z.string(), z.unknown())).optional(),
          findings: z.array(z.record(z.string(), z.unknown())).optional(),
          glossary_terms: z.array(z.record(z.string(), z.unknown())).optional(),
        }).passthrough(),
      },
    },
    async ({ batch }) => {
      const b = batch as unknown as ResearchBatch;

      // Idempotency first, before anything is staged.
      const { data: prior } = await client.from('research_submissions').select('id, status, report, created_at').eq('submitted_by', caller.userId).eq('idempotency_key', b.idempotency_key).maybeSingle();
      if (prior) return text({ duplicate: true, submission_id: prior.id, status: prior.status, created_at: prior.created_at, report: prior.report, note: 'This idempotency_key was already submitted; nothing new was staged.' });

      const slugs = [
        ...(b.substance_updates ?? []).map((u) => u.slug),
        ...(b.sources ?? []).flatMap((s) => s.substances ?? []),
        ...(b.findings ?? []).map((f) => f.substance_slug),
      ].filter(Boolean);
      const ctx = await loadContext(client, slugs);
      const report = validateResearchBatch(b, ctx);

      // Bibliographic check on accepted sources with a PMID. A mismatch or
      // missing record rejects that source (and findings that depend on it).
      const acceptedSources = report.accepted.sources.map((i) => (b.sources ?? [])[i]);
      const pmidChecks = await checkPmids(acceptedSources);
      const badPmids = new Set(pmidChecks.filter((c) => c.status === 'mismatch' || c.status === 'not_found').map((c) => c.pmid));
      const extraIssues: Issue[] = [];
      if (badPmids.size) {
        report.accepted.sources = report.accepted.sources.filter((i) => {
          const s = (b.sources ?? [])[i];
          if (s.pmid && badPmids.has(s.pmid)) {
            extraIssues.push({ entity: 'sources', index: i, path: 'pmid', severity: 'error', kind: 'reference', message: pmidChecks.find((c) => c.pmid === s.pmid)!.detail });
            report.counts.sources.accepted--; report.counts.sources.rejected++;
            return false;
          }
          return true;
        });
        report.accepted.findings = report.accepted.findings.filter((i) => {
          const f = (b.findings ?? [])[i];
          if (f.source_pmid && badPmids.has(f.source_pmid)) {
            extraIssues.push({ entity: 'findings', index: i, path: 'source_pmid', severity: 'error', kind: 'reference', message: 'its source failed the PubMed metadata check' });
            report.counts.findings.accepted--; report.counts.findings.rejected++;
            return false;
          }
          return true;
        });
      }
      report.issues.push(...extraIssues);
      const anyAccepted = report.accepted.substance_updates.length + report.accepted.sources.length + report.accepted.findings.length + report.accepted.glossary_terms.length > 0;

      if (!anyAccepted) {
        return text({ accepted: false, staged: false, report, pmid_checks: pmidChecks, note: 'Nothing in this batch passed validation, so nothing was staged or recorded. Fix the issues and submit again with a new idempotency_key.' });
      }

      // Stage sources and findings through the existing import RPCs (as the caller).
      let batchId: string | null = null;
      const staging: Json = {};
      const stageSources = report.accepted.sources.map((i) => (b.sources ?? [])[i]);
      const stageFindings = report.accepted.findings.map((i) => (b.findings ?? [])[i]);
      if (stageSources.length || stageFindings.length) {
        const { data: created, error: bErr } = await client.rpc('admin_create_import_batch', {
          p_meta: { label: `[connector] ${b.label}`, schema_version: 1, generated_by: b.generated_by ?? 'research connector', row_count: stageSources.length + stageFindings.length, notes: b.test ? 'TEST batch' : null },
        });
        if (bErr) throw new Error(`could not create import batch: ${bErr.message}`);
        batchId = created as string;
        if (stageSources.length) {
          const { data, error } = await client.rpc('admin_import_sources', { p_batch_id: batchId, p_rows: stageSources });
          if (error) throw new Error(`staging sources failed: ${error.message}`);
          staging.sources = data;
        }
        if (stageFindings.length) {
          const { data, error } = await client.rpc('admin_import_findings', { p_batch_id: batchId, p_rows: stageFindings as FindingRow[] });
          if (error) throw new Error(`staging findings failed: ${error.message}`);
          staging.findings = data;
        }
        await client.rpc('admin_finalize_import_batch', { p_batch_id: batchId, p_counts: { imported_count: stageSources.length + stageFindings.length, entity_counts: { sources: stageSources.length, findings: stageFindings.length } } });
      }

      const payload = {
        kind: b.kind, schema_version: b.schema_version, label: b.label, generated_by: b.generated_by ?? null, test: !!b.test,
        substance_updates: report.accepted.substance_updates.map((i) => (b.substance_updates ?? [])[i]),
        glossary_terms: report.accepted.glossary_terms.map((i) => (b.glossary_terms ?? [])[i]),
        sources: stageSources, findings: stageFindings,
      };
      const touched = [...new Set([...payload.substance_updates.map((u) => u.slug), ...stageSources.flatMap((s) => s.substances), ...stageFindings.map((f) => f.substance_slug)])];
      const fullReport = { validation: report, pmid_checks: pmidChecks, staging, policy: 'needs_review: every submission waits for an administrator. Sources and findings are staged; descriptions and glossary terms are applied only on approval.' };
      const { data: rec, error: rErr } = await client.rpc('admin_record_research_submission', {
        p_idempotency_key: b.idempotency_key, p_label: b.label, p_client: b.generated_by ?? 'research connector', p_is_test: !!b.test,
        p_payload: payload, p_report: fullReport, p_batch_id: batchId, p_substance_slugs: touched,
      });
      if (rErr) throw new Error(`recording submission failed: ${rErr.message}`);

      return text({
        accepted: true,
        staged: true,
        submission_id: (rec as Json).id,
        status: 'needs_review',
        counts: report.counts,
        rejected_rows: report.issues.filter((i) => i.severity === 'error'),
        warnings: report.issues.filter((i) => i.severity === 'warning'),
        pmid_checks: pmidChecks,
        next: 'The owner reviews this in Admin → Research → Submissions. Fix any rejected rows in a new batch with a new idempotency_key. Do not resubmit accepted rows.',
      });
    },
  );

  return server;
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

const app = new Hono().basePath(`/${FUNCTION_NAME}`);

const protectedResourceMetadata = () => ({
  resource: RESOURCE_URL,
  authorization_servers: [AUTH_SERVER],
  bearer_methods_supported: ['header'],
  scopes_supported: ['openid', 'email', 'profile'],
  resource_name: 'StackAtlas research connector',
});
app.get('/.well-known/oauth-protected-resource', (c) => c.json(protectedResourceMetadata()));
app.get('/health', (c) => c.json({ ok: true, name: 'stackatlas-research', resource: RESOURCE_URL }));

app.all('/', async (c) => {
  const auth = await authenticate(c.req.raw);
  if (auth instanceof Response) return auth;
  const server = buildServer(auth);
  const transport = new WebStandardStreamableHTTPServerTransport();
  await server.connect(transport);
  return transport.handleRequest(c.req.raw);
});

Deno.serve(app.fetch);
