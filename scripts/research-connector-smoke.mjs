#!/usr/bin/env node
// Deployment-dependent smoke test for the research connector.
// Usage: node scripts/research-connector-smoke.mjs <function-url> <access-token> [non-admin-token]
// Exercises: unauthenticated 401, tools/list, get_substance_context, a labelled
// TEST batch submission (test: true, no description change), idempotent
// resubmission, malformed batch, fake PMID. Prints PASS/FAIL per step.
const [url, token, nonAdminToken] = process.argv.slice(2);
if (!url || !token) { console.error('usage: node scripts/research-connector-smoke.mjs <url> <token> [non-admin-token]'); process.exit(2); }

let id = 0;
async function rpc(method, params, auth = token) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }),
  });
  const body = await res.text();
  // Streamable HTTP may answer as SSE; pull the JSON out of the data line.
  const line = body.split('\n').find((l) => l.startsWith('data:'));
  let json = null;
  try { json = JSON.parse(line ? line.slice(5) : body); } catch { /* non-JSON */ }
  return { status: res.status, headers: res.headers, json, body };
}
const tool = async (name, args, auth) => {
  const r = await rpc('tools/call', { name, arguments: args }, auth);
  const txt = r.json?.result?.content?.[0]?.text;
  return { ...r, data: txt ? JSON.parse(txt) : null };
};
const check = (label, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? ' — ' + extra : ''}`); if (!ok) process.exitCode = 1; };

const noAuth = await rpc('tools/list', {}, null);
check('no token → 401 with WWW-Authenticate', noAuth.status === 401 && /resource_metadata/.test(noAuth.headers.get('www-authenticate') ?? ''));
if (nonAdminToken) { const r = await rpc('tools/list', {}, nonAdminToken); check('non-admin token → 403', r.status === 403); }

const list = await rpc('tools/list', {});
const names = (list.json?.result?.tools ?? []).map((t) => t.name).sort();
check('tools/list exposes exactly the three tools', JSON.stringify(names) === JSON.stringify(['get_research_queue', 'get_substance_context', 'submit_research_batch']), names.join(','));

const ctx = await tool('get_substance_context', { slugs: ['magnesium-glycinate'] });
check('get_substance_context returns the substance', ctx.data?.substances?.[0]?.slug === 'magnesium-glycinate', ctx.data?.substances?.[0]?.description?.slice(0, 60));

const key = `smoke-${Date.now()}`;
const batch = {
  kind: 'stackatlas-research-batch', schema_version: 1, idempotency_key: key, label: 'TEST connector smoke', generated_by: 'smoke script', test: true,
  sources: [{ title: 'The effect of magnesium supplementation on primary insomnia in elderly: A double-blind placebo-controlled clinical trial', source_type: 'human_study', pmid: '23853635', year: 2012, substances: ['magnesium-glycinate'], notes: 'connector smoke test' }],
};
const sub = await tool('submit_research_batch', { batch });
check('test batch accepted and staged as needs_review', sub.data?.accepted === true && sub.data?.status === 'needs_review', JSON.stringify(sub.data?.pmid_checks));
const again = await tool('submit_research_batch', { batch });
check('same idempotency_key → duplicate, nothing staged', again.data?.duplicate === true);

const bad = await tool('submit_research_batch', { batch: { kind: 'wrong', schema_version: 1, idempotency_key: `${key}-bad`, label: 'x' } });
check('malformed batch → rejected, not staged', bad.status !== 200 || bad.data?.accepted === false || !!bad.json?.error);

const fake = await tool('submit_research_batch', { batch: { ...batch, idempotency_key: `${key}-fake`, sources: [{ ...batch.sources[0], pmid: '999999999', title: 'Not a real paper' }] } });
check('fake PMID → source rejected, nothing staged', fake.data?.accepted === false, JSON.stringify(fake.data?.pmid_checks));

console.log(`\nSubmission to review/revert in Admin → Research → Submissions: ${sub.data?.submission_id ?? '(none)'}`);
