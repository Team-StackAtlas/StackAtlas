# StackAtlas Master Handoff

Last updated: July 13, 2026
Owner: Domonic Mata
Repo: Team-StackAtlas/StackAtlas
Purpose: current source of truth for any AI coding session (Claude Code, ChatGPT/Codex, or other). Supersedes the July 11 handoff wherever they conflict.

## 1. Read this first

The July 12–13 push rebuilt the platform's foundations. Everything below is
LIVE in production (Supabase project `gjqzwqftdnagctpfkdpf`, frontend at
getstackatlas.vercel.app). Do not re-plan or re-build these systems; extend
them.

The product rules from the July 11 handoff still apply unchanged: the eight
product areas (Map, Square, Create, Library, Lab, Notifications, Comms,
Admin), the public language guardrails (no "recommended dosage", "proven",
"best", "safe", "effective"; use "reported dose ranges", "possible risks"),
no leaderboards/tiers/scores, no legality features, findings never publish
automatically.

## 2. What works in production right now

- **Posting persists.** Signed-in users create Dispatches and Signals in
  Create; they publish to Supabase via the `create_post` RPC and appear in
  Square, on substance/brand/stack pages, and on profiles. Comments, nested
  replies, comment likes, and post likes all persist. Admins can soft-delete
  and restore posts (Admin → Deleted), and authors/comment authors get
  notifications for likes, comments, and replies.
- **The catalog is Supabase-backed.** 17 substances, 3 brands, 3 stacks live
  in the database (seeded through the importer itself). Map, substance,
  brand, and stack pages read from Supabase and fall back to the bundled
  seed data only if the backend is unreachable or empty.
- **The research pipeline is complete.** Admin → Research has: a Data Pack
  import wizard (load → validate/preview → import), a Source Library, a
  Findings tab with Approve/Reject/Reopen (audit-logged), and Import History
  with owner-only one-click **Revert** that removes exactly what a batch
  created.
- **Saves, follows, hides, votes, star ratings, Library albums** all persist
  (these were silently broken for months due to missing table grants —
  fixed).
- **Admin is real**: users tab with audited role management (owner-only,
  enforced in the database by a trigger — a site_admin cannot self-promote),
  account status actions, moderation log viewer, deleted-content restore.
- **Global search** (Cmd/Ctrl+K) across substances, brands, stacks, and
  posts.
- **CI**: typecheck, lint, build, and an 8-test Playwright smoke suite run
  on every PR (`npm test` locally; tests run in seed mode, no secrets).

## 3. Architecture map (do not fight this)

- Frontend: React 19 + Vite + Tailwind 4, hosted on Vercel. No server; all
  backend work is Supabase (Postgres + RLS + SECURITY DEFINER RPCs).
- **Providers**: `CatalogProvider` (substances/brands/stacks) and
  `PostsProvider` (Dispatches/Signals) load Supabase data once and expose it
  through `useCatalog()` / `usePosts()`; both render bundled seed data
  instantly and swap in real data, so pages never blank. All catalog/post
  reads go through these hooks — never import the mock arrays directly in
  pages for content that should be live.
- **Writes go through RPCs**, never direct table writes from the client,
  when the operation needs validation, natural-key resolution, or audit
  logging. Every RPC re-checks the caller's stored role
  (`profiles.site_role` via `is_site_admin()` / `is_site_owner()`).
- **Identity convention**: substance and brand ids in the UI are their
  SLUGS (`magnesium-glycinate`, not uuids). Stacks use uuids. Posts from
  Supabase carry `persisted: true`; seed posts have ids like `p1` and stay
  on localStorage code paths (guarded by UUID checks).
- Key services: `src/services/catalog` (catalog loader/mapper),
  `src/services/posts` (posts + comments), `src/services/import` (the pack
  engine: parse → validate → runImport → revert), `src/services/supabase`
  (accounts/social/moderation facade used via AuthContext `services`).

## 4. The research data pipeline (how Domonic adds data)

1. Generate a **Data Pack** (versioned JSON: substances, brands, stacks,
   sources, findings, referencing each other by slug/PMID/DOI) with a cheap
   model using the copy-paste prompt templates in `docs/data-packs/prompts/`.
   Golden rule: findings only from pasted source material, never from model
   memory. Full format reference: `docs/data-packs/README.md`.
2. Admin → Research → Import: drop or paste the JSON (CSV works for plain
   source lists), review the per-row validation report (ready / will-update
   / duplicate / invalid), import. Findings land as `pending_review`.
3. Review findings in the Findings tab; approve or reject (audit-logged).
4. Bad batch? Import History → Revert (owner-only) removes exactly what it
   created. Catalog rows are corrected by re-importing, not reverted.

The importer is idempotent: re-importing a corrected file updates by natural
key (substance/brand slug; source pmid → doi → url → title+year; finding
composite) instead of duplicating.

## 5. Database conventions (critical for future sessions)

- Migrations live in `supabase/migrations/` with **timestamp filenames**
  (`YYYYMMDDHHMMSS_name.sql`) and are applied through the Supabase MCP
  `apply_migration` (or CLI) so the recorded version matches the filename.
  History drift and its repair are documented in
  `supabase/migrations/README.md` — read it before touching migrations.
- Production force-enables RLS on every new table (event trigger). Every new
  table therefore NEEDS explicit policies and grants or it is deny-all.
- Never put service-role keys in browser code. The anon key + RLS + RPCs is
  the entire client security model.
- `profile_stats` is SECURITY DEFINER **on purpose** (public counts over
  private follows rows). The old `research_runs` system is gone — do not
  rebuild anything run-based.
- Verification pattern used all push: exercise RPCs against production in a
  `begin; select set_config('request.jwt.claims', '{"sub":"<user-uuid>",
  "role":"authenticated"}', true); ...; rollback;` transaction.

## 6. Working agreement for AI sessions

- Audit before building; the repo and this handoff are the truth, in that
  order for implementation vs product intent.
- One focused PR per chunk; run `npm run typecheck && npm run lint &&
  npm run build && npm test` before pushing (smoke tests need
  `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium` in sandboxes with a
  pre-installed browser).
- Domonic has auto-accept on and wants PRs merged when CI is green without
  asking. Do not ask permission for routine work; stop only for destructive
  production data changes or product-direction decisions.
- Match existing UI conventions (Tailwind, rounded-2xl cards, lucide icons,
  section-scoped errors, honest empty states, no dead buttons, no raw
  snake_case labels).

## 7. What remains (in priority order)

1. **Real research data** — generate packs with the kit and import them.
   Nothing else blocks this; it is data work, not code work.
2. Substance page deeper visual redesign toward the mockups (origin /
   half-life / categories already render; layout polish remains).
3. Quarters admin controls (Admin tab is a placeholder; Comms Quarters
   exist).
4. Public research sections on substance pages — GATED until approved
   findings exist; render approved findings only, cautious framing.
5. ESLint warning burndown (~40 warnings, all pre-existing patterns) and a
   device-level mobile QA pass.
6. Dead-button cleanup: `AdminObjectActions` component (Edit/Hide/Merge
   buttons are non-functional placeholders).
7. Glossary import/manager, source metadata editing — nice-to-haves from
   the old roadmap.

## 8. Owner-action checklist (Domonic, once)

- GitHub: repo Settings → General → Pull Requests → check "Allow
  auto-merge" (needs org admin).
- Supabase: Authentication → Providers → Email → enable leaked-password
  protection (may require Pro plan).
- Sanity pass on the live site signed in as `domonic`: create a Dispatch,
  comment on it, check Notifications, import `docs/data-packs/examples/
  sample-pack.json` through Admin → Research, approve a finding, revert the
  batch.

## 9. PR ledger for this push (July 12–13)

#49 import system core (schema, engine, admin rebuild, catalog wiring,
generation kit) · #50 stale-seed cleanup + README rewrite · #52 migration
history alignment · #53 Library persistence + function hardening · #54
grants repair (follows/saves/votes 42501 bug) · #55 findings review
actions · #56 posts persistence schema · #57 owner-only role management
(security fix) · #58 posts frontend wiring · #59 comment persistence ·
#60 canonical categories · #61 comment/reply notifications trigger · #62
Playwright smoke suite in CI · #63 admin soft delete/restore + Deleted
tab · #64 global search · #65 copy audit · #66 brand transparency · #67
bundle splitting · #68 import batch revert. (#51 was closed unmerged as
redundant.)
