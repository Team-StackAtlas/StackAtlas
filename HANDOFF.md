# StackAtlas — Master Handoff Audit (July 23, 2026)

Read-only audit of the StackAtlas codebase, database model, and UI, produced
for an engineer with **no repo and no database access**, to plan an
architecture push, a research-data importer, and a UI repair/polish pass.
Nothing was modified, migrated, deployed, or pushed while producing this file.
Section numbers match the request template.

**Companion doc:** `HANDOFF_JULY_23.md` (repo root) — the session work ledger
with per-PR detail. This file is the *audit*; that file is the *changelog*.

---

## ⚠️ WHAT I COULD NOT CHECK (read first)

Supabase MCP access was **denied for every call this session** (including
read-only `execute_sql`). Vercel dashboards were not reachable from this
environment either. Therefore:

| Item | Status |
|---|---|
| §3 live schema queries (information_schema, pg_policies, pg_indexes, row counts, enums, triggers) | **NOT RUN.** Schema below is reconstructed **verbatim from committed migration files** — labeled as such. Any dashboard-made drift is invisible to me (and drift *is* confirmed to exist, see §4). |
| §3 actual per-table row counts | **NOT CHECKED.** Only file-derived expectations given. |
| §4 Supabase security/performance advisors | **NOT RUN** (requires `get_advisors`, denied). |
| §4 generated-types diff vs live schema | **NOT POSSIBLE.** No committed generated types exist (see §1) and type generation requires DB access. |
| §3 auth config (providers, email confirmation, JWT expiry) | **NOT CHECKED** (dashboard-only). |
| §6 Vercel runtime errors (7 days) and production build logs | **NOT CHECKED** (no Vercel access from this environment). |
| §9 Vercel project settings / custom domain / env presence in Vercel | **NOT CHECKED** directly; `vercel.json` contents given instead. Deployment behavior *observed* via PR preview deploys succeeding all session. |
| Live-site fetch of `https://getstackatlas.vercel.app/` | **NOT FETCHED** from this sandbox (egress proxy); CSR-only nature is confirmed from source instead (§1). |
| Backed-mode (signed-in Supabase) UI flows | **NOT TESTED LIVE** — no `.env` in this container (mock mode only). Backed code paths were code-reviewed, not executed. |
| Playwright smoke suite (`npm test`) | **NOT RUN in this audit pass** (long-running; CI runs it green on every PR — latest green run: CI #311 wave, July 23). Unit tests **were** run: see §1. |

Everything else below was verified directly against files, running the app in
mock mode, or command output pasted verbatim.

---

## Section 0 — Recent work (session context + quibs)

30 PRs merged July 22–23 (approx #131–#160) by the autonomous session that
produced this audit. Full detail in `HANDOFF_JULY_23.md`. Quick quibs:

- **Research import system** (engine + Admin UI + AI data-pack kit): the big
  one. Client-side ZIP/JSON/CSV/Markdown importer with dedup + batch revert.
  *Problem:* it predates the exact E0001/S0001 dataset spec in §8 — close but
  not 1:1 (assessment in §8).
- **45-substance research package imported** to prod (chunks 1–11). *Problem:*
  importer stored research areas as type_tags with no category routes; fixed
  client-side via keyword inference (`src/lib/categoryInference.ts`), which is
  a band-aid — categories should eventually be persisted.
- **Comms rebuilt messenger-grade** (two-pane, grouping, attachments, GIFs,
  role badges, bottom-anchored threads, broken-image fallback, avatars).
  *Problem:* message reactions have no backed persistence (mock-only).
- **Compare rebuilt** differences-first + relevance-ranked second pick.
  *Problem:* relevance only exists for substances, not brands/stacks.
- **Goals onboarding + goal-ranked feeds.** *Problem:* profile sync dark until
  `20260723050000_profile_goals.sql` is applied.
- **Catalog cleanup** (probiotics/electrolyte-blends are ingredient classes,
  not substances): mock removed; prod removal is a committed-but-unapplied
  migration.
- **Post photos + profile avatars + lightbox**: full identity/image layer.
  *Problem:* images are data-urls in text columns (deliberate stopgap; see
  §10.2).
- **A dozen audit-found bug fixes**: Following feed dead in mock mode,
  album-create crash (`currentTarget` after await), stale notification badge,
  dead Albums filter chip, blank-page chunk errors, etc.
- **Ops pain all day:** GitHub Actions delivery lag (runs not spawning for
  5–9 min), one hung runner (frozen `updated_at`), one stale-head merge 409.
  Remedies documented in `HANDOFF_JULY_23.md` §3.3.
- **Supabase migration-history drift** surfaced 07:48 UTC via the failing
  "Supabase Preview" check on main — see §4, it's load-bearing for the
  importer plan.

---

## Section 1 — Stack and repo shape

**Framework: Vite 6 + React 19 SPA. No Next.js. Client-rendered only.**

- `package.json` `"type": "module"`, build = `vite build`, no SSR/SSG anywhere.
- `index.html` is an empty shell: `<div id="root"></div>` + module script
  (repo root `index.html`, 13 lines). **The empty HTML you saw at
  `getstackatlas.vercel.app` is expected and permanent under this
  architecture** — every route is CSR. `vercel.json` rewrites `/(.*) →
  /index.html` (SPA fallback), confirming no server rendering.
- **SEO implication (P1):** public substance/brand/glossary pages ship zero
  crawlable content. Google's renderer may index some of it eventually;
  social-card unfurls (OG tags) will always show the bare shell. If organic
  search matters for substance pages, this needs prerendering/SSR (migration
  to Next/Remix/Astro-islands, or a prerender step) — a large architectural
  decision, flagged not prescribed.

### package.json (verbatim, current)
```json
{
  "name": "stackatlas",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port=3000 --host=0.0.0.0",
    "build": "vite build",
    "preview": "vite preview",
    "clean": "rm -rf dist",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "seed:validate": "tsx scripts/validate-seed.ts",
    "seed:sql": "tsx scripts/generate-seed-sql.ts",
    "pack:from-mock": "tsx scripts/export-mock-pack.ts",
    "test": "playwright test",
    "test:unit": "vitest run"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.107.0",
    "@tailwindcss/vite": "^4.1.14",
    "@vitejs/plugin-react": "^5.0.4",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "fflate": "^0.8.3",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-markdown": "^10.1.0",
    "react-router-dom": "^7.13.1",
    "tailwind-merge": "^3.5.0",
    "vite": "^6.2.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.4",
    "@playwright/test": "^1.58.2",
    "@types/node": "^22.14.0",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "autoprefixer": "^10.4.21",
    "eslint": "^9.39.4",
    "eslint-config-prettier": "^10.1.8",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "globals": "^17.6.0",
    "playwright": "^1.58.2",
    "prettier": "^3.8.3",
    "tailwindcss": "^4.1.14",
    "tsx": "^4.21.0",
    "typescript": "~5.8.2",
    "typescript-eslint": "^8.60.1",
    "vite": "^6.2.0",
    "vitest": "^4.1.10"
  }
}
```
Oddity: `@tailwindcss/vite` and `@vitejs/plugin-react` sit in `dependencies`
(should be dev); harmless for a Vite SPA but untidy.

### Styling
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin. **No `tailwind.config`
  file exists** (v4 CSS-first config): theme lives in `src/index.css`
  (`@variant dark` class-based dark mode). NOT FOUND: shadcn/ui, any component
  library. Components are hand-rolled; `src/components/ui/` contains only
  `ToastProvider.tsx`.
- Utility helpers: `cn()` = clsx + tailwind-merge (`src/lib/utils.ts`).

### State/data layer
- **No React Query / SWR / Redux.** Raw `@supabase/supabase-js` client behind
  a hand-rolled service layer (`src/services/supabase/index.ts` ~big file,
  plus domain services: `catalog/ comms/ posts/ glossary/ research/ import/`).
- React Contexts: `AuthContext, CatalogContext, PostsContext, FilterContext,
  GlossaryContext, LogContext, MockRoleContext, ThemeContext,
  UserScopeContext` (`src/context/`).
- **The mode switch:** `isBackendConfigured` in
  `src/services/supabase/client.ts` — env vars absent ⇒ full mock/localStorage
  mode; present ⇒ Supabase. Nearly every hook branches on it. This dual-mode
  design is the app's defining architectural trait.
- Realtime: Comms uses `postgres_changes` with a 60s heartbeat fallback and
  300ms debounce (`src/hooks/useComms.ts:51-58`).

### Directory tree (depth 3, node_modules/dist/.git excluded)
```
.
├── AGENTS.md  CLAUDE.md  HANDOFF_JULY_23.md  README.md  metadata.json
├── eslint.config.js  playwright.config.ts  vitest.config.ts  vite.config.ts  vercel.json
├── index.html  package.json  tsconfig.json
├── scrape.js  update_mock.cjs  update_tags.cjs        <- legacy root scripts (see §10.5)
├── docs/
├── scripts/            (validate-seed.ts, generate-seed-sql.ts, export-mock-pack.ts)
├── tests/              (Playwright smoke tests)
├── src/
│   ├── App.tsx  main.tsx  index.css
│   ├── components/     (31 files; admin/ subdir: QuarterControls, SourceLibrary,
│   │                    FindingsList, GlossaryManager, ImportHistory, …; ui/ToastProvider)
│   ├── context/        (9 contexts, listed above)
│   ├── data/           (mockData.ts, mockGlossary.ts, seedPosts.ts)
│   ├── hooks/          (useComms, useMockComms, useLibrary, useSaved, useFollowing,
│   │                    useNotifications, useGoals, useHiddenItems, usePostLike,
│   │                    useBrandRatings, useRequireAccountAction)
│   ├── lib/            (bearings, categoryInference, substanceName, imageUtils,
│   │                    comments, account, utils, icon maps; __tests__/)
│   ├── pages/          (25 pages, full route list in §2)
│   └── services/       (supabase/, catalog/, comms/, posts/, glossary/, research/,
│                        import/ (+7 test files), seed/, types.ts, contracts.ts,
│                        validation.ts, index.ts)
└── supabase/
    └── migrations/     (52 SQL files, listed in §4)
```

### TypeScript
- `tsconfig.json`: **`"strict": true`** ✅, `noFallthroughCasesInSwitch`,
  bundler resolution, `allowJs: true`. `tests/`, `scrape.js`,
  `update_mock.cjs`, `update_tags.cjs` are **excluded from typechecking**.
- **NOT FOUND: generated Supabase types.** No `database.types.ts`, no
  `Database` generic anywhere. All service files hand-map rows with
  `/* eslint-disable @typescript-eslint/no-explicit-any */` headers
  (`src/services/supabase/index.ts:32`, `posts/index.ts:8`,
  `catalog/index.ts:20`, `comms/index.ts:21`, `import/runner.ts:5`). This is
  the single biggest type-safety hole; row-shape drift is caught only at
  runtime. (§10.2 item 1.)

### Lint / format / tests — REAL OUTPUT (run July 23 ~08:12 UTC)
```
> vitest run
 Test Files  8 passed (8)
      Tests  59 passed (59)
   Duration  1.25s
```
Unit tests cover the import engine (7 suites: parse, validate, zip, messy-zip,
markdown, catalog-csv, research-package) plus `src/lib/__tests__`.
```
> eslint .
✖ 22 problems (0 errors, 22 warnings)
```
Warning breakdown: ~14× `react-hooks/set-state-in-effect` ("setState
synchronously within an effect", mostly Admin panels + contexts), ~8×
`react-refresh/only-export-components` (contexts exporting hooks alongside
providers). Zero errors. `tsc --noEmit` passes clean (run continuously this
session). Playwright smoke suite runs in CI (`.github/workflows/ci.yml`:
typecheck → lint → build → unit → Playwright chromium smoke) and was green on
every merged PR through #160's wave.

**Zero `TODO`/`FIXME`/`HACK`/`XXX` comments and zero `@ts-ignore` in `src/`**
(verified by grep). The only suppressions are the 17 documented
`eslint-disable` lines listed in §6.

---

## Section 2 — Route and screen inventory

Router: `src/App.tsx:54-79`. All routes lazy-loaded inside a Suspense wrapped
by `AppErrorBoundary` (`src/components/AppErrorBoundary.tsx` — reloads once on
chunk-load errors). Auth gate component: `src/components/RequireAuth.tsx`
(only used on `/create`); most "auth" in mock mode is soft
(`useRequireAccountAction`).

| Path | File | Renders | Auth | Status |
|---|---|---|---|---|
| `/` | App.tsx:61 | redirect → `/map` | no | works |
| `/map` | pages/Map.tsx | catalog: substances/brands/stacks tabs, category rail, For You/Following | no | **works** |
| `/square` | pages/Square.tsx | social feed (Dispatches+Signals), sorts, Following feed + filters | no | **works** |
| `/lab` | pages/Lab.tsx | hub: Substance/Brand/Stack Compare + Glossary links | no | works |
| `/compare` | pages/Compare.tsx | picker + differences-first comparison | no | **works** |
| `/comms` | pages/Comms.tsx | DMs + Quarters messenger | soft | **works** |
| `/notifications` | pages/Notifications.tsx | list, unread filter, settings, mark-all-read | soft | **works** |
| `/profile`, `/profile/:username` | pages/Profile.tsx | own/other profile, goals card, edit form (backed-only) | soft | **works** |
| `/library`, `/library/albums/:id` | pages/Library.tsx, AlbumDetail.tsx | saved items, albums, per-item notes | soft | **works** |
| `/glossary` | pages/Glossary.tsx | grouped terms + search | no | works |
| `/post/:id` | pages/PostDetail.tsx | post + threaded comments + lightbox | soft | **works** |
| `/substance/:id` (+alias `/supplement/:id`) | pages/SupplementPage.tsx | two-col substance page | no | **works** |
| `/brand/:id` | pages/BrandPage.tsx | ratings, transparency, products | no | works |
| `/stack/:id` | pages/StackPage.tsx | stack contents + related posts | no | works |
| `/create` | pages/Create.tsx | Dispatch/Signal composer (+photo) | **RequireAuth** | **works** |
| `/login` | pages/Login.tsx | Supabase email auth (backed) / notice (mock) | no | works (backed path NOT live-tested) |
| `/onboarding` | pages/Onboarding.tsx | scope step → goals step | no | works |
| `/admin` | pages/Admin.tsx | tabbed admin (Research/Review/Suggest Edits/Users/Deleted/Quarters/Log) | **role-gated** | works (gates correctly; admin flows NOT live-tested this session) |
| (admin) | pages/AdminResearch.tsx | importer UI, source library, findings, batches | role-gated | works per earlier session testing |
| (admin) | pages/ModerationQueue.tsx | report queue | role-gated | NOT deeply tested this session |
| `/log/intake`, `/log/entry`, `/log/notes` | pages/LogIntake/LogEntry/LogNotes.tsx | legacy "log" flow, localStorage-backed (`user_logs`, `user_notes`) | no | **suspect legacy** — not linked from primary nav; see §6 dead-code |
| `*` | pages/NotFound.tsx | branded 404 ("This page isn't on the map") | no | works |

Per-route notes (mock mode, verified by driving with Playwright this session —
screenshots in `handoff-screenshots/`):

- **Map** (`light-map.png`, `dark-map.png`, `mobile-map.png`,
  `x-map-brands.png`, `x-map-stacks.png`): real empty/loading behavior via
  CatalogContext; data = mock in this container, Supabase in prod. Category
  rail has paddles + goal-first ordering. No debug output. 17 substances in
  mock; 45+ in prod catalog.
- **Square** (`light-square.png`, `mobile-square.png`,
  `fix-following-feed.png`): For You + Following both functional (Following
  fixed for mock in PR #155). Empty states are designed (`EmptyState`
  component), not blank. Sort chips are swipeable but unlabeled overflow on
  mobile (§7).
- **Comms** (`fix-light-comms.png`, `dark-comms.png`, `x-comms-quarters.png`,
  `mobile-thread-open.png`): DMs, requests, quarters, attachments, role
  badges, avatars. A seeded perpetual "typing…" indicator shows in mock (demo
  artifact, `src/hooks/useMockComms.ts`). Reactions render mock-only
  (`hideReactions = message.persisted === true`, `src/pages/Comms.tsx:~315`).
- **Library/Albums** (`light-library.png`, `q4-album-with-item.png`): full
  loop works (create → add → notes → share → make public).
- **Substance page** (`light-substance.png`, `w-substance-dark-full.png`,
  `mobile-substance.png`): At-a-glance rail; related posts; brand reliability
  card shows explicit "No brand records linked to this substance yet." for
  sparse data (good). See §7 for the sparse-evidence assessment.
- **Create** (`x-create.png`, `img-feed.png`): full two-format composer with
  structured protocol fields, bearings picker, photo attach.
- **Admin** (`o-admin.png`): correctly denies in mock ("You do not have access
  to Admin Research."). Tabs render.
- **Notifications** (`x-notifications.png`): all types, click-through links
  fixed (#153), settings panel, badge sync (#156).
- **Log pages** (`/log/*`): reachable by URL only. Write to localStorage keys
  `user_logs`/`user_notes` via `src/context/LogContext.tsx:81-85`. No nav
  entry points found. Candidate dead code (§6).

---

## Section 3 — Database: schema (FILE-DERIVED — live queries NOT RUN)

**The SQL blocks the template asked me to run could not be executed** (access
denied all session). What follows is reconstructed from the 52 committed
migration files, which CI's "Supabase Preview" check has kept mostly honest —
but §4 documents **confirmed drift**, so treat this as "schema as designed,"
not "schema as deployed."

### Table inventory (66 tables created across migrations)
```
admin_notes, administration_methods, audit_events, bearings,
brand_health_labels, brand_ingredients, brand_products, brand_star_ratings,
brands, category_routes, comms_typing_states, conversation_participants,
conversations, follow_requests, follows, glossary_terms, hidden_items,
library_album_items, library_albums, markers, message_attachments,
message_reactions, message_read_states, messages, moderation_log,
moderation_queue, notification_settings, notifications, post_bearings,
post_comment_votes, post_comments, post_votes, posts, product_batches,
product_variants, profiles, quarter_invites, quarter_members,
quarter_message_attachments, quarter_messages, quarters, reports,
research_extracted_notes, research_findings, research_import_batches,
research_runs, research_source_brands, research_source_stacks,
research_source_substances, research_sources, saved_items, sources,
stack_components, stacks, substance_administration_methods, substance_aliases,
substance_effects, substance_markers, substance_pairings, substance_routes,
substance_type_tags, substances, suggest_edits, test_results, type_tags, users
```
Note `users` (0001) is a legacy app-side table distinct from `auth.users`;
`profiles` (0002+) is the live identity table. `sources`/`test_results` (0001)
are the *old* source model; `research_sources` (0012+) is the current one.

### RLS
- `alter table … enable row level security`: **44 distinct tables** across
  migrations. **119 `create policy` statements** total. Per-file counts:
  0001:10, 0003:2, 0005:3, 0006:4, 0007:4, 0008:3, 0009:15, 0010:5, 0011:7,
  0012:3, 0014:2, 0015:3, research_import_system:7,
  library_persistence:4, posts_persistence:9, public_approved_findings:2,
  quarters_persistence:1, quarters_admin_controls:3, fix_comms_rls_recursion:8,
  glossary:1, comms_attachments:6, admin_research_phase1:10,
  public_substance_sources:2, source_brand_stack_links:5.
- **Which tables have RLS disabled? UNKNOWN without live query.** 66 created
  vs 44 enable-statements means **up to 22 tables may lack RLS** — but many of
  those are covered because 0001 enables RLS with a loop/batch or the tables
  are grant-revoked instead. This exact question **requires the live
  `pg_tables.rowsecurity` query in the template** — top item for whoever gets
  DB access. Candidates to verify first: `administration_methods`,
  `category_routes`, `markers`, `type_tags`, `bearings` (reference tables,
  probably public-read by design), and legacy `users`, `sources`,
  `test_results`.
- Policies referencing `true`: public-read catalog policies do use
  `using (true)` for select on reference/catalog tables (by design, e.g.
  posts read: `20260713001500_posts_persistence.sql`). Write policies observed
  all check `auth.uid()` and/or `is_site_admin()`/`is_site_owner()`.
- The comms policies had a real recursion bug historically — fixed in
  `20260713203000_fix_comms_rls_recursion.sql` (8 rewritten policies). Worth a
  live re-review.
- Representative verbatim function (role guard), from
  `supabase/migrations/20260713003000_admin_role_management.sql:9-24`:
```sql
create or replace function guard_site_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.site_role is distinct from old.site_role
     and auth.uid() is not null and not is_site_owner() then
    raise exception 'only the site owner can change roles';
  end if;
  if old.site_role = 'site_owner'
     and new.site_role is distinct from old.site_role
     and auth.uid() is not null and not is_site_owner() then
    raise exception 'the site owner role cannot be removed by another user';
  end if;
  return new;
end $$;
```
- **Storage buckets** (from migrations; live listing NOT CHECKED):
  1. `comms-attachments` — private; per-conversation/quarter RLS policies;
     10 MB limit; image/pdf/text MIME allowlist
     (`20260720130000_comms_attachments.sql:26+`).
  2. `research-docs` — **private**, 10 MB, MIME allowlist
     (pdf/png/jpeg/webp/gif/text/markdown), admin-only read:
```sql
create policy research_docs_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'research-docs' and is_site_admin());
```
     (`20260720170000_admin_research_phase1.sql:17-30`).
- **Service-role key client-side: NOT FOUND** — grep for `service_role`,
  `eyJ…`-shaped literals, and `sk-` patterns across `src/`, `scripts/`,
  `supabase/` returned nothing. Only `VITE_SUPABASE_ANON_KEY` is referenced
  (`src/services/supabase/client.ts`). ✅
- Enums: only one `create type` enum family found in migrations —
  `review_status as enum ('pending','approved','rejected')`
  (`0001_initial_schema.sql:15`) plus `post_kind` (posts migration). Most
  newer status fields use `text + check` constraints instead (inconsistency
  noted, §10.2).

### Row counts
**NOT CHECKED** (no DB access). Known from session history: 45 imported
substances + 16 mock-parallel seeds; research_sources on the order of
hundreds (chunks 1–11 imported); everything else unknown.

---

## Section 4 — Migrations, drift, advisors

### Migration files (52, chronological)
```
0001_initial_schema.sql              0002_account.sql
0003_real_profiles_privacy.sql       0004_backfill_auth_profiles.sql
0005_profile_permissions.sql         0006_library.sql
0007_follows_privacy.sql             0008_notifications.sql
0009_comms.sql                       0010_moderation_intake.sql
0011_admin_review_quarter_controls.sql  0012_admin_substance_research.sql
0013_domonic_site_owner.sql          0014_owner_bulk_research_sources.sql
0015_repair_research_source_ingestion.sql
20260711190452_research_import_system.sql        (40 KB — the importer schema)
20260712221226_drop_run_research_and_stale_seed.sql
20260712230500_library_persistence_and_function_hardening.sql
20260712231000_library_owner_profile_fk.sql
20260712232500_repair_user_table_grants.sql
20260712234500_findings_review_actions.sql
20260713001500_posts_persistence.sql
20260713003000_admin_role_management.sql
20260713013000_comment_notifications.sql
20260713021500_admin_post_moderation.sql
20260713023000_brand_transparency.sql
20260713031500_import_batch_revert.sql
20260713043000_public_approved_findings.sql
20260713051500_source_document_provenance.sql
20260713063000_admin_edit_source.sql
20260713100000_comms_dm_persistence.sql
20260713190000_comms_quarters_persistence.sql
20260713200000_quarters_admin_controls.sql
20260713203000_fix_comms_rls_recursion.sql
20260713210000_quarter_governance.sql
20260713220000_comms_realtime.sql
20260720120000_glossary.sql
20260720130000_comms_attachments.sql
20260720140000_harden_notifications_and_functions.sql
20260720150000_performance_indexes.sql
20260720160000_profile_stats_exclude_deleted.sql
20260720170000_admin_research_phase1.sql
20260721030000_public_substance_sources.sql
20260722040000_source_brand_stack_links.sql
20260722050000_source_link_perf_cleanup.sql
20260722060000_fix_profile_embeds.sql
20260722070000_fix_remaining_profile_embeds.sql
20260723030000_album_item_notes.sql            (APPLIED to prod)
20260723050000_profile_goals.sql               (NOT applied)
20260723060000_catalog_cleanup_noncanonical_substances.sql  (NOT applied)
20260723070000_post_images.sql                 (NOT applied)
```

### Is history clean and linear? **NO — drift is confirmed.**
As of July 23 07:48 UTC the Supabase GitHub integration's check on `main`
fails with:
```
Remote migration versions not found in local migrations directory.
```
Diagnosis (high confidence): several migrations this session were applied via
the Supabase MCP `apply_migration` tool, which records versions in the remote
`supabase_migrations.schema_migrations` table under names that don't match the
committed filenames. Additionally, three committed files
(`profile_goals`, `catalog_cleanup_noncanonical_substances`, `post_images`)
are **not applied at all**. Net: remote history ⊃≠ local files in both
directions. Remedy path (for whoever has DB access):
`supabase migration list --linked`, then `supabase migration repair` /
stub files; or bypass history entirely by applying the three pending files
via the SQL editor. **Do not run blind `supabase db push` until reconciled.**

### Advisors
**NOT RUN** — requires `get_advisors` (denied). Run both advisors first thing
once access exists; the RLS-disabled-tables question (§3) overlaps with what
the security advisor reports.

### Generated types
**NOT FOUND in repo; generation NOT POSSIBLE without DB access.** There is
nothing to diff. Recommendation recorded in §10.2.

---

## Section 5 — Role model and admin

- Representation: **`profiles.site_role` text column** (`'member' |
  'site_admin' | 'site_owner'`), plus SQL helpers `is_site_admin()` /
  `is_site_owner()` used inside RLS policies and RPCs. Seeded owner:
  `0013_domonic_site_owner.sql`.
- **Checked at all three layers:** ✅
  1. **Database triggers** — `guard_site_role_change()` trigger blocks any
     role change by non-owner *regardless of client*
     (`20260713003000_admin_role_management.sql:9-35`, verbatim in §3).
  2. **RPCs/RLS** — e.g. `admin_import_sources` raises unless
     `is_site_admin()` (`20260713051500…sql:29`); `research-docs` bucket read
     policy requires `is_site_admin()`.
  3. **Client** — `src/components/Layout.tsx:33`
     `const showAdmin = profile?.siteRole === 'site_admin' || profile?.siteRole === 'site_owner';`
     gates nav visibility only (defense in depth, not the security boundary).
- **Client-only role checks: NOT FOUND** — every admin mutation observed goes
  through a `security definer` RPC that re-checks the role server-side. This
  is one of the genuinely solid parts (§10.4).
- Promote/demote path: `admin_set_site_role(p_user_id, p_role)` RPC
  (`20260713003000_admin_role_management.sql:37+`), owner-only, surfaced in
  Admin → Users tab. Audit-logging of role changes: the RPC writes
  moderation/audit records — verify exact wiring live; `audit_events` table
  exists (`20260720170000_admin_research_phase1.sql`) and is written by the
  phase-1 research RPCs. **Row count NOT CHECKED.**
- Admin screens inventory (`src/pages/Admin.tsx` tabs + `src/components/admin/`):
  Research (importer, functional), Review (report queue), Suggest Edits,
  Users (role management), Deleted content, Quarters (QuarterControls),
  Log (moderation log), GlossaryManager, SourceLibrary, FindingsList,
  ImportHistory (batch list + revert). All render; all were exercised earlier
  in the session era except ModerationQueue (light coverage — flagged).

---

## Section 6 — What is actually broken

- **Vercel runtime errors / build logs: NOT CHECKED** (no access). Observed
  proxy: every PR preview deploy succeeded all session; production build is
  the same `vite build` that passes locally in ~5s.
- **Browser console, per route (mock mode, this container):** zero page
  errors on Map, Square, Comms, Library, Album detail, Profile, Notifications,
  Create, Compare, Substance/Brand/Stack, Glossary, Lab, Admin, Onboarding,
  PostDetail — verified via Playwright `pageerror` capture during the July 23
  audit passes. Known benign noise: `ERR_TUNNEL_CONNECTION_FAILED` for
  external images in this sandbox (egress-blocked), and a 404 for
  deliberately-probed nonexistent routes.
- **TODO/FIXME/HACK/XXX: none in `src/`.** Full `eslint-disable` list
  (17, all with stated reasons): `src/components/admin/QuarterControls.tsx:58`,
  `SourceLibrary.tsx:69`, `FindingsList.tsx:51`, `GlossaryManager.tsx:60`,
  `ImportHistory.tsx:56`, `src/components/ui/ToastProvider.tsx:88`,
  `src/services/{catalog,supabase,posts,comms}/index.ts` + `import/runner.ts`
  (file-level `no-explicit-any`), `src/pages/PostDetail.tsx:144`,
  `Admin.tsx:66`, `ModerationQueue.tsx:41`, `Comms.tsx:178`,
  `src/context/AuthContext.tsx:54,86`.

### Dead-code hunt: the run-based Admin Research system
**Verdict: fully purged from the app; one DB artifact remains.**
- `grep collecting_sources|extracting_notes|research_runs|ResearchRun` across
  `src/`: **zero hits**. No component, route, type, or status string leaks.
- Database: `research_runs` and its status vocabulary
  (`draft/collecting_sources/extracting_notes/needs_review/completed/failed`)
  were created in `0012_admin_substance_research.sql:7` and **dropped** in
  `20260712221226_drop_run_research_and_stale_seed.sql` → classification:
  **database-only, already removed** (assuming that migration is applied —
  live check pending). One inconsistency: the July 23 catalog-cleanup
  migration (`20260723060000…sql:26`) still defensively deletes from
  `research_runs` — harmless if the table is gone (`delete` on a missing
  table would actually error… it doesn't, because that migration only runs
  if the table exists? **No — it would error.** Flag: if `research_runs` was
  truly dropped in prod, `20260723060000_catalog_cleanup_noncanonical_substances.sql`
  **will fail on the `research_runs` delete line and needs that line removed
  before applying.** Concrete pre-apply check for whoever runs it.)
- Legacy 0001-era tables `sources`, `test_results`, `users` and the root
  scripts `scrape.js`, `update_mock.cjs`, `update_tags.cjs`: **orphaned**
  (no `src/` references found) — deletion candidates, §10.5.
- `/log/*` routes + `LogContext` (`user_logs`, `user_notes` localStorage):
  **unreachable from nav**, self-contained. Classification:
  `orphaned/unreachable` unless a deep link exists somewhere I didn't find.

### Persistence check — localStorage vs Supabase (complete write inventory)
Design intent: in mock mode *everything* persists to localStorage; in backed
mode the same hooks write to Supabase. The following genuinely dual-write
(localStorage always, Supabase when backed) — this is by design, not a bug:
`useSaved (stackatlas_saved)`, `useFollowing (stackatlas_following)`,
`useLibrary (stackatlas_albums, stackatlas_album_items)`,
`useNotifications (stackatlas_notifications, …_settings)`,
`useGoals (goals inside stackatlas_user_scope)`, `usePostLike`,
`useHiddenItems`, `useBrandRatings`, `PostsContext (stackatlas_posts)`,
comment overrides (`stackatlas_comments_<postId>`, PostDetail.tsx:36-44).
**Items that should write to Supabase but never do (real gaps):**
1. **Comms message reactions** — mock-only; no backed table
   (`message_reactions` exists in 0009 for DMs — verify whether the UI ever
   writes it; current Comms code hides reactions for persisted messages,
   `src/pages/Comms.tsx` `hideReactions`). Gap acknowledged in
   HANDOFF_JULY_23 §3.2.
2. **Goals → profile** — code ships but the column doesn't exist until
   `20260723050000_profile_goals.sql` is applied (best-effort write fails
   silently by design).
3. **Post photos in backed mode** — dropped by the RPC until
   `20260723070000_post_images.sql` is applied.
4. **`/log/*` flow** — pure localStorage, no backed path at all (orphaned
   feature).
5. **Square tab choice** (`stackatlas_square_tab`) and theme — localStorage
   only, correctly so.

### Real-flow tests (mock mode, executed this session)
sign-up/sign-in/sign-out & session refresh: **NOT TESTABLE here** (no env).
Create Dispatch ✅ (with photo), create Signal ✅, comment ✅, nested reply ✅,
like ✅, save ✅, follow user/substance ✅ (feeds react), notification
mark-read/badge ✅, DM send ✅ + quarter message ✅ (mock), album loop ✅,
admin gate ✅. Silent failures found and already fixed during the session:
Following feed (mock), album-create reset crash, badge desync — see §0.

---

## Section 7 — UI quality audit

Screenshots: **30 files in `handoff-screenshots/`** (desktop 1440×900 + mobile
390×844, light+dark). Key ones: `light-map.png`, `dark-map.png`,
`w-substance-dark-full.png`, `fix-compare-result.png`, `fix-light-comms.png`,
`mobile-thread-open.png`, `q4-album-with-item.png`, `lightbox-open.png`,
`o-admin.png`, `x-notifications.png`.

- **Design tokens:** coherent in practice, not tokenized in theory. Tailwind
  utility classes with a consistent palette convention — emerald accents,
  slate light / zinc dark surface ramps (e.g. the canonical card:
  `rounded-2xl border border-slate-200 bg-white … dark:border-zinc-800
  dark:bg-zinc-900/50` — used in ~all cards). No CSS-variable token layer;
  changing brand color = mass find/replace. Radius scale consistent
  (rounded-xl/2xl), spacing mostly 4/8-based.
- **Raw data leaking into UI: none found.** No snake_case labels, raw enum
  strings, raw IDs, or unformatted timestamps surfaced in any screen driven
  this session (timestamps go through `date-fns`/`Intl`; enums map through
  label maps like `CLASSIFICATION_PILL`, `TYPE_TAGS`,
  `administrationIcons.ts`). The old `review_status`-leak class of bug was in
  the deprecated run system, which is gone.
- **Generated-CRUD feel:** none in user-facing surfaces (cards/detail layouts
  everywhere). Admin panels are utilitarian tables **by design**; Suggest
  Edits and Users tabs are the barest.
- **Inconsistencies (honest list):**
  - ~~Mobile chip rows had no scroll affordance~~ **FIXED July 23**: right-
    edge fade on mobile (`scroll-fade-r`, `src/index.css`) + the previously
    undefined `hide-scrollbar` utility is now actually defined (it was
    referenced in 3 files but existed nowhere — Windows users saw raw
    scrollbars).
  - ~~Stack card meta wrap at 390px~~ **FIXED July 23**
    (whitespace-nowrap + truncate, `src/pages/Map.tsx` stack card footer).
  - Comms action row (Report/delete) is always-visible at ~70% opacity —
    busy on touch, where hover-reveal can't work.
  - Two button vocabularies coexist: pill buttons (rounded-full) in
    profile/comms headers vs rounded-xl CTAs elsewhere — deliberate-looking
    but undocumented.
- **Responsive:** dedicated bottom tab bar + mobile header; all primary
  routes verified at 390px (`mobile-*.png`). Nothing structurally breaks; the
  chip-overflow affordance above is the worst offender.
- **Loading states:** contexts render mock/seed data immediately then hydrate
  (catalog/posts pattern, `src/context/PostsContext.tsx:22-27`), so
  content-jump is minimal by architecture; there are no skeleton components
  (NOT FOUND) — spinner/“Loading profile…” text strings exist on
  Profile/route Suspense (`Profile.tsx:224`). Acceptable, not polished.
- **Accessibility:** aria-labels present on icon buttons in the code driven
  (e.g. `aria-label="Remove photo"`, `aria-label="Post actions"`,
  lightbox `role="dialog"`); focus rings via Tailwind `focus:` utilities on
  most interactive elements; **no systematic audit was performed** — keyboard
  traversal of Comms and the bearing picker modal, and contrast checking of
  emerald-on-white text, remain unchecked. Semantic headings used (h1–h3).
- **Sparse-evidence rendering (credibility-critical):**
  - Substance page with no linked brands renders explicit text: *“No brand
    records linked to this substance yet.”* (`w-imported-substance` capture;
    `src/pages/SupplementPage.tsx` Brand Reliability card). ✅
  - Brand page transparency card lists testing report links when present
    (`x-brand` capture: “Testing report 1/2”); **the zero-COA state needs
    live verification against a prod brand with no documents — wording of an
    explicit “No public COA located” state was NOT confirmed.** If it renders
    an empty box instead, that is a credibility bug to fix in the polish
    pass. (`src/pages/BrandPage.tsx` — check `transparency` empty branch.)
  - “Unknown” classification is deliberately never rendered as a “?” badge
    anymore (#135).
- **Medical-advice wording:** grep for “recommended dos(e|age)” returns
  **zero hits**. The app uses “Reported dose range”, “Global average”,
  “Anecdotal, not medical claims”, and a per-page disclaimer (“For
  informational purposes only — not medical advice…”, SupplementPage
  at-a-glance rail). ✅ Language discipline is good.

---

## Section 8 — Research data model and import readiness

### Where entities live (current schema, file-derived)
- **substances** + satellites `substance_aliases` (unique lower(alias) —
  `20260711190452…sql:86`), `substance_routes`, `substance_type_tags`,
  `substance_markers`, `substance_effects`, `substance_pairings`,
  `substance_administration_methods`.
- **brands** + `brand_products (unique (brand_id, name),
  0001_initial_schema.sql:162-168)` + `brand_ingredients` +
  `product_variants (brand_product_id, variant_name, form, size, strength,
  country_formula — 20260720170000…sql:48-59)` + `product_batches` +
  `brand_health_labels`, `brand_star_ratings`, transparency docs
  (`20260713023000_brand_transparency.sql`).
- **Evidence/sources:** `research_sources` (typed `source_type` vocabulary of
  10 values incl. `coa_or_testing_document`, `official_label_or_document` —
  see verbatim check in §3 excerpt), `research_source_substances` (unique
  `(source_id, substance_id)`), `research_source_brands`,
  `research_source_stacks` (+ link-table migration
  `20260722040000_source_brand_stack_links.sql`), `research_findings` (+
  review actions), `research_extracted_notes`,
  `research_import_batches (dedup_key unique — …research_import_system.sql:142)`.
- Row counts: **NOT CHECKED** (no DB).

### Does import code exist? **YES — substantial.**
`src/services/import/` (~12 modules + 7 passing test suites):
ZIP intake (`zip.ts`, fflate, entry/size limits), JSON pack + CSV parsers,
Markdown extraction with ambiguous-match handling, `validate.ts` natural-key
chain (pmid → doi → url → content-hash → title+year), SHA-256 hashing
(`hash.ts`, verbatim in audit gathering), `runner.ts` orchestrating admin
RPCs (`admin_import_sources` etc.), **batch model with revert**
(`listImportBatches`, `revertImportBatch`;
`20260713031500_import_batch_revert.sql`), Admin UI in
`src/pages/AdminResearch.tsx` + `src/components/admin/ImportHistory.tsx`.
Plus a data-pack authoring kit in `docs/` and `scripts/export-mock-pack.ts`.

### Review gating / provenance / history
- `review_status` concepts exist but are **fragmented**: enum
  `('pending','approved','rejected')` on 0001-era tables; text+check
  `('unreviewed','needs_review','approved','rejected','archived')` on
  findings; a 7-value vocabulary on sources
  (`0012_admin_substance_research.sql:32,58`). Publishing gate: public reads
  are policy-filtered to approved rows
  (`20260713043000_public_approved_findings.sql`,
  `20260721030000_public_substance_sources.sql`) — i.e. **the gate is
  enforced in RLS**, which is the right place. ✅
- **Provenance:** `research_sources.raw_content, content_hash,
  original_filename, file_type, import_relative_path`
  (`20260713051500_source_document_provenance.sql:11-15`) + `research-docs`
  storage bucket + `audit_events`. A published finding → source → original
  document chain **exists**. ✅
- **Historical/unresolved records:** partially. Sources dedup rather than
  version; `product_batches` exists but is empty-by-design so far; there is
  **no superseded/conflict model** on products or labels — the model assumes
  one current row per product. ❌
- **Natural key for product variants: DOES NOT EXIST.** `brand_products`
  has `unique (brand_id, name)` but `product_variants` has **no unique
  constraint** across `(brand_product_id, variant_name, size, form)` —
  idempotent variant upserts are impossible today without adding one. ❌
- **Dedup/content-hash:** yes for sources (client `hash.ts` + DB
  `content_hash` + `research_import_batches.dedup_key`). Nothing equivalent
  for products/variants. ❌

### Gap assessment vs. the delivered dataset (45 substances / 41 brands /
280 variants / 396 evidence / 396 ledger rows / 47 queue / stable `E0001`
`S0001` IDs / per-doc SHA-256 / resumable checkpoint / everything
`needs_review` / never-publish-directly / preserve-history / full trace)

**UPDATE (July 23, overnight push):** deltas 1, 2, 4 (variant history), 6,
and 7 below shipped as `supabase/migrations/20260723080000_importer_phase2_dataset_support.sql`
(apply alongside the other pending migrations) + engine support: `external_ref`
is now the strongest dedup identity in `sourceKeyVariants`, flows through pack
JSON and CSV (`id`/`source_id`/`external_ref` headers), survives the pre-
migration RPC harmlessly, and back-attaches via the new
`admin_set_source_external_refs` RPC after import. Remaining: unified
review_status vocabulary (delta 3), a per-row import checkpoint (delta 4's
cursor half), and drift reconciliation (delta 8) — the last one is yours.

**Honest distance at audit time: ~70% there. Specific missing pieces:**
1. **Stable external IDs**: no `external_id`/`ledger_id` column on
   `research_sources`, findings, `brand_products`, or `product_variants` to
   carry `E0001`/`S0001` — the current dedup chain is content-based. Add
   `external_ref text unique` per entity (or a mapping table).
2. **Variant natural key**: add
   `unique (brand_product_id, coalesce(variant_name,''), coalesce(size,''), coalesce(form,''))`
   (expression unique index) before importing 280 variants idempotently.
3. **Unified `review_status`**: pick one vocabulary; the importer must write
   `needs_review` — today three different columns/vocabularies would claim
   that word.
4. **Checkpoint/resume**: `research_import_batches` records batches but has
   no per-row cursor; a resumable checkpoint needs either idempotency strong
   enough to re-run whole files safely (achievable with items 1–2) or a
   `import_progress` table.
5. **History preservation**: add `superseded_by uuid` /
   `status='superseded'` on variants+labels, or an append-only
   `product_variant_revisions` table, so re-imports never overwrite.
6. **Future-research queue (47 rows)**: no destination table exists.
   NOT FOUND anywhere. Needs a small `research_queue` table.
7. **Evidence↔product linkage**: sources link to substances/brands/stacks
   but **not to `product_variants`** — a
   `research_source_products` link table is required for COA-level evidence.
8. Migration-history drift (§4) must be reconciled **before** any importer
   migration lands, and the `research_runs` line in the pending cleanup
   migration must be reviewed (§6).

The client engine (parse/validate/hash/batch/revert + admin UI + tests) is
reusable nearly as-is; the work is almost entirely in the schema deltas above.

---

## Section 9 — Environment and config

- **Env vars referenced in source (names only):**
  - `VITE_SUPABASE_URL` — read in `src/services/supabase/client.ts`.
  - `VITE_SUPABASE_ANON_KEY` — same file.
  - `DISABLE_HMR` — dev-only, `vite.config.ts` server block.
  - Presence in Vercel: **NOT CHECKED** (no dashboard access). Inference:
    production runs in backed mode, so both `VITE_*` vars must be set there.
- **`NEXT_PUBLIC_*`: N/A** (not Next). The two `VITE_*` values are
  public-by-design (Supabase URL + anon key). Security rests on RLS, which is
  the correct model — making the live RLS verification in §3 the single most
  important follow-up.
- **Secrets in repo: NONE FOUND.** `.gitignore` covers `.env*` except
  `.env.example` (placeholders only). Note: an **untracked** `.env.bak`
  exists in this working container (names `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`; values not read) — it is *not* in git; its
  presence (and the absence of `.env`) is why this container runs mock mode.
  No action needed beyond awareness.
- **`vercel.json` (verbatim):**
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
- Custom domain: **NOT CHECKED**; all session URLs observed were
  `stackatlas-git-….vercel.app` previews and `getstackatlas.vercel.app`.
- Cron/edge functions/webhooks/background jobs: **NOT FOUND** in repo (no
  `supabase/functions/`, no Vercel crons in `vercel.json`). Comms realtime is
  Supabase Realtime, not a job.
- CI: single workflow `.github/workflows/ci.yml` — checkout → Node 20 →
  `npm ci` → typecheck → lint → build → unit tests → Playwright chromium
  smoke. Note: **GitHub Actions exhibited repeated delivery lag and one hung
  runner on July 23** (5–9 min run-spawn delays; frozen `updated_at` hang);
  remedies in `HANDOFF_JULY_23.md` §3.3.

---

## Section 10 — Honest assessment

### 10.1 Top launch blockers (ranked)
1. **P0 — RLS ground truth unverified.** 66 tables vs 44 RLS-enable
   statements in files, live `pg_tables/pg_policies` never run, advisors
   never run. Until someone executes §3's queries, the security posture is
   *designed-good, verified-nothing*. Evidence: this audit, §3.
2. **P0 — Migration-history drift** blocks safe `db push`; three shipped
   features are dark in prod until their migrations apply
   (goals sync, catalog cleanup, post photos). Evidence: failing Supabase
   Preview on main 07:48 UTC; §4.
3. ~~P0 (conditional) — pending cleanup migration referenced dropped
   run-era tables~~ **RESOLVED July 23**: the migration was rewritten against
   the real post-drop FK graph (only `stack_components` +
   `research_source_substances` restrict) before anyone applied it. §6.
4. **P1 — CSR-only + empty HTML shell** kills SEO/social-unfurl for exactly
   the pages meant to attract users (substances/brands). §1.
5. **P1 — No generated DB types**; hand-mapped `any` rows in five service
   files means schema drift surfaces as runtime bugs. §1.
6. **P1 — Importer schema deltas** (external IDs, variant unique key,
   unified review_status, queue table, source↔product links) block the
   396-evidence dataset. §8.
7. **P1 — Backed-mode auth flows untested recently** (sign-up/confirm/reset;
   no live test possible this session). §6.
8. ~~P2 — Brand zero-COA empty state unconfirmed~~ **RESOLVED by
   verification**: `src/pages/BrandPage.tsx:159-165` renders explicit "No
   reviewed transparency records yet…" when no documentation exists. §7.
9. **P2 — data-url images in DB text columns** (posts.image_url,
   profiles.avatar_url) — fine at current scale, needs bucket migration
   before feeds get image-heavy. §10.2.
10. **P2 — Comms reactions not persisted backed** (visible feature works in
    demo, silently absent for real users). §6.

### 10.2 Top architectural mistakes (3-month pain)
1. Hand-rolled row mapping with `any` instead of generated Supabase types.
2. Images as data-urls in text columns instead of storage buckets.
3. Three competing `review_status` vocabularies (enum vs two text+check
   sets).
4. No token layer over Tailwind (rebrand = mass edit).
5. Dual-mode (mock/backed) logic interleaved in every hook — superb for
   demos, but every new feature must be written twice; a storage-adapter
   interface would halve that cost.

### 10.3 Top security findings (RLS-first)
1. Verify RLS enabled + policies on all 66 tables live (P0, unknown).
2. Run both Supabase advisors (unknown).
3. Confirm the comms RLS recursion fix holds under the current policy set.
4. Confirm legacy `users`/`sources`/`test_results` tables are either dropped
   or locked.
5. Positive finding: **no service-role key client-side, no secrets in git,
   role changes guarded by DB trigger + owner-only RPC** — the role model is
   genuinely solid.

### 10.4 Genuinely solid — don't touch
Role/permission architecture (trigger+RPC+RLS); the import engine + tests +
batch revert; provenance columns + research-docs bucket; the error-boundary +
lazy-route shell; Comms realtime with fallback heartbeat; the mock-mode demo
experience; language discipline (no medical-advice phrasing); zero
TODO/ts-ignore hygiene.

### 10.5 Dead — delete (with confidence)
- `scrape.js`, `update_mock.cjs`, `update_tags.cjs` (root) — 95%.
- `/log/*` pages + `LogContext` + `user_logs`/`user_notes` keys — 85%
  (verify no deep links first).
- Legacy `users`, `sources`, `test_results` tables — 75% (DB-side check
  needed).
- `src/components/MockRolePanels.tsx` + `MockRoleContext` — 60% (may still
  back a demo role-switcher; verify usage before removing).

### 10.6 Surprises
- Zero TODOs in a codebase this size.
- The dreaded run-based research system is *already* fully purged from the
  app — the hunt found one defensive SQL line, not a haunted subsystem.
- 119 RLS policies in migrations — far more security intent than typical at
  this stage; the gap is verification, not design.
- The mock mode is complete enough that this entire audit's UI section was
  produced without a database.

---

*Produced July 23, 2026. Read-only: no code changed, nothing pushed, nothing
applied. Untracked additions: this file + `handoff-screenshots/` (30 PNGs),
left uncommitted per the audit's own rules — commit them whenever you like.*
