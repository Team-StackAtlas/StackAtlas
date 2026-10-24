# StackAtlas research connector: setup and test plan

The connector is a Supabase Edge Function (`supabase/functions/research-mcp`)
that speaks the Model Context Protocol. Regular Claude connects to it as a
custom connector, signs in to StackAtlas as you, and gets exactly three tools:
`get_research_queue`, `get_substance_context`, `submit_research_batch`.
Nothing it submits is public until you approve it in Admin → Research → Submissions.

## How it is secured

- Supabase Auth is the OAuth 2.1 server. Claude is redirected to StackAtlas's
  own consent page (`/oauth/consent`), you sign in and approve, and Claude
  receives a token that acts as **your** account.
- The function verifies that token on every call and refuses any account that
  is not `site_admin` or `site_owner`.
- It then calls the existing owner-gated import RPCs **as you**. There is no
  service-role key in the function, so it can do nothing you could not do.
- Writes are limited to: staging sources and findings (already-existing
  `unreviewed` / `pending_review` states) and recording a submission row.
  Description and glossary changes are applied only by `admin_publish_research_submission`,
  which only the owner can call from the Admin page.

## One-time setup (owner, dashboards only)

1. **Apply the pending SQL.** Supabase → SQL Editor → paste all of
   `docs/ops/pending-migrations-2026-10-20.sql` → Run. It now includes
   `20261024120000_research_submissions.sql`. Safe to run twice.
2. **Enable the OAuth server.** Supabase → Authentication → OAuth Server →
   turn it on. Set **Authorization Path** to `/oauth/consent`.
   Turn on **Dynamic client registration** (Claude registers itself; you still
   approve every grant on the consent page).
3. **Check the Site URL.** Supabase → Authentication → URL Configuration →
   Site URL must be your production site (e.g. `https://stackatlas.app`), because
   the consent page is Site URL + `/oauth/consent`.
4. **Deploy the function** (one of):
   - Supabase → Edge Functions → Deploy a new function → via Editor → name it
     `research-mcp`, paste `supabase/functions/research-mcp/index.ts` as `index.ts`,
     add a second file `deno.json` with the contents of
     `supabase/functions/research-mcp/deno.json`, and a third file
     `_shared/researchBatch.ts`... (if the editor cannot take folders, inline
     the validator: copy the body of `supabase/functions/_shared/researchBatch.ts`
     to the top of `index.ts` and delete the `import ... from '../_shared/researchBatch.ts'` line).
     **Turn off "Verify JWT with legacy secret"** for this function: it verifies
     tokens itself so that the OAuth discovery endpoint can be reached first.
   - Or ask a Claude Code session to deploy it with the Supabase connector.
5. **Confirm the health endpoint.** Open
   `https://gjqzwqftdnagctpfkdpf.supabase.co/functions/v1/research-mcp/health`
   in a browser; it should return `{"ok":true,...}`.
6. **Add the connector in Claude.** Claude app → Settings → Connectors →
   Add custom connector → URL
   `https://gjqzwqftdnagctpfkdpf.supabase.co/functions/v1/research-mcp`
   → leave OAuth fields empty (discovery is automatic) → Connect. You will be
   sent to StackAtlas to sign in and approve.
7. **Create the research Project in Claude** and paste
   `docs/research/CLAUDE_RESEARCH_DIRECTOR.md` as its instructions.

## End-to-end test (deployment-dependent)

Run in this order; each step has a visible pass condition.

1. In the Claude research project: "Call get_substance_context for `magnesium-glycinate`."
   Pass: Claude shows the current description, sources, findings, aliases.
2. "Submit a test batch for `magnesium-glycinate` with `test: true`, label
   `TEST connector smoke`, one source with PMID 28847062 (a real magnesium
   sleep trial) linked to the substance, and no description change."
   Pass: report says `accepted: true`, `status: needs_review`, `pmid_checks[0].status: match`.
3. Admin → Research → Submissions: the row appears with the `test` badge.
4. Click **Approve & publish**. Pass: status becomes Published; the source
   shows in Source Library; Import History shows the `[connector]` batch.
5. Open `/substance/magnesium-glycinate`: the card's linked-source count
   includes the new source.
6. Click **Revert**. Pass: status Reverted; the batch disappears from Import
   History; Moderation log shows `research_submission_reverted`.
7. Resubmit the same batch (same `idempotency_key`). Pass: `duplicate: true`,
   nothing new staged.
8. Negative tests via the smoke script (below): no token → 401 with
   `WWW-Authenticate`; a non-admin token → 403; malformed batch → nothing
   staged; a proposal that merely shortens a good description → warning
   shown to the reviewer; a fake PMID → source rejected.

`scripts/research-connector-smoke.mjs` runs steps 1, 2, 7 and the negative
tests from a terminal given a URL and a token (`node scripts/research-connector-smoke.mjs <url> <token>`).
It is for whoever has a terminal; the Claude-side steps above are the
no-terminal path.

## Limits and costs

- Research runs when you open the Claude project and ask; nothing runs
  unattended. Usage counts against your Claude plan.
- Edge Function invocations: a few per batch, well inside the free tier.
- The OAuth server is in beta on Supabase and free during beta.
- PMID checks call NCBI's public API; they verify a paper's existence, title
  and year only.
