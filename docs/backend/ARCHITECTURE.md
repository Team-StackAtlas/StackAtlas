# StackAtlas Backend Foundation

This document records the backend architecture decision and the foundation laid
in this PR. **No production persistence is wired into the app yet** — the running
app still uses the in-memory mock data. This PR establishes the schema, service
contracts, and a validated import/seed pipeline so the migration can happen
incrementally and safely.

## 1. Architecture decision: Supabase (managed Postgres)

**Recommendation: Supabase.**

### Why

StackAtlas today is a client-only Vite SPA with no server, deployed as static
assets, using rich, highly-relational data (substances ↔ routes ↔ type tags ↔
markers ↔ brands ↔ products ↔ stacks ↔ posts ↔ sources). The data model is
relational, not document-shaped, and several surfaces are user-owned (saved,
hidden, follows, posts) and need per-row authorization.

Supabase fits this better than the alternatives:

| Option | Fit | Notes |
| --- | --- | --- |
| **Supabase** ✅ | **Best** | Managed **Postgres** (matches the relational model), built-in **Auth** (no auth code to own), **Row-Level Security** for user-owned rows, instant typed REST/Realtime, first-class TypeScript client, and **Edge Functions** for the bit of server logic we need (imports, moderation actions). Keeps the static-SPA deployment model — no server to run. |
| PostgreSQL + Prisma | Good schema fit | Same Postgres data model, but requires **building and hosting a Node API + auth** ourselves. More to own/operate for a prototype. The SQL schema here transfers directly if we ever switch to this. |
| Firebase | Poor | Document/NoSQL store is a bad fit for this many-to-many relational model; we'd fight the database on every join. |
| Custom Node/API + DB | Most control, most work | Premature for a prototype; we'd reinvent auth, RLS, and hosting. |

### What makes this low-risk to adopt

- The schema (`supabase/migrations/0001_initial_schema.sql`) is **standard
  Postgres** — portable to Prisma or any Postgres host if we change our minds.
- The app talks to data through **service interfaces** (`src/services/contracts.ts`),
  not directly to Supabase. Swapping the implementation (mock → Supabase →
  something else) touches one adapter, not the UI.

## 2. Data model

Full schema: [`supabase/migrations/0001_initial_schema.sql`](../../supabase/migrations/0001_initial_schema.sql).

Highlights / deliberate decisions:

- **Controlled vocabularies** (`type_tags`, `administration_methods`, `markers`,
  `bearings`, `category_routes`) are **lookup tables**, not free text, so imports
  can be validated against them and multi-value data can't be stuffed into one
  field.
- **Classification** is a Postgres `enum` (`Everyday`, `Clinical`, `Frontier`,
  `Unknown`) matching the v1 frontend model — no legal/regulatory meaning.
- **Dispatches and Signals** share structure and are modeled as one `posts`
  table with a `post_kind` enum (`dispatch` | `signal`). This keeps `post_votes`,
  `reports`, and `bearings` references simple (one FK target) instead of
  duplicating them per kind. Convenience views `dispatches` and `signals` expose
  them separately.
- **Sources are polymorphic**: a single `sources` table attaches to any object
  (`target_type`, `target_id`) and an optional `section` (e.g. `dosage`,
  `side_effects`, `brand_claim`, `ingredient`, `testing`, `summary`,
  `stack_description`) and `claim` string — so the same source model serves
  substance summaries, dosage/side-effect sections, brand claims, ingredient and
  testing/reliability claims, and stack descriptions.
- **Dedup** is enforced with unique constraints: `substances.slug`,
  `brands.slug`, and `stacks.component_signature` (a normalized, sorted hash of
  component substance ids) so the same stack can't be created twice.
- **User-owned rows** (`saved_items`, `hidden_items`, `follows`, `post_votes`,
  `posts`, `reports`, `suggest_edits`, `notifications`) are designed for
  Row-Level Security (owner can read/write their own; public read where
  appropriate). Starter RLS is enabled in the migration with `TODO` markers for
  the full policy pass.

### Tables

`users`, `profiles`, `substances`, `category_routes`, `type_tags`,
`administration_methods`, `markers`, `substance_routes`, `substance_type_tags`,
`substance_administration_methods`, `substance_markers`, `brands`,
`brand_products`, `brand_ingredients`, `brand_health_labels`,
`brand_star_ratings`, `stacks`, `stack_components`, `posts` (dispatches +
signals), `bearings`, `post_bearings`, `post_votes`, `sources`, `reports`,
`suggest_edits`, `saved_items`, `hidden_items`, `follows`, `notifications`,
`moderation_queue`.

## 3. Service / API contracts

[`src/services/contracts.ts`](../../src/services/contracts.ts) defines a typed
interface per domain: auth/session, profiles, search, catalog reads
(substance/brand/stack), posts (dispatch/signal CRUD), saved/watchlist, hidden
items, follows, reports, suggest-edits, notifications, admin moderation, brand
ratings, and imports.

These are **interfaces + a `NotImplemented` stub** today. The intended adapters:

- `SupabaseServices` — the production implementation (follow-up PR).
- A `MockServices` adapter over the existing `src/data` can be added to let the
  UI migrate page-by-page behind the same interface without a big-bang rewrite.

## 4. Import / seed + validation

- [`src/services/seed/import.ts`](../../src/services/seed/import.ts) defines the
  canonical import record shapes and `validateDataset()`, which returns a
  structured report (counts + errors).
- [`src/services/validation.ts`](../../src/services/validation.ts) holds the
  reusable validators.
- [`scripts/validate-seed.ts`](../../scripts/validate-seed.ts) builds an import
  dataset from the current mock data and prints the operator report. Run it with:

  ```bash
  npm run seed:validate
  ```

### Validation rules covered

- Duplicate substances / brands / stacks (by slug and by stack component signature).
- Invalid classification (must be one of the four).
- Invalid category routes (must reference a known domain/category).
- Invalid stack component counts (2–10 components).
- Invalid source URLs (must be http(s) and well-formed).
- Invalid type tags / administration methods / markers (must be in the controlled vocab).
- Multi-value data stuffed into one field (e.g. commas/slashes/`&`/“and” in a
  single tag, route, or name value).

## 5. Developer / operator status

`npm run seed:validate` is the first operator tool: it reports **data counts**,
**validation errors**, and acts as the **import status / dry-run** check before
any real import.

Planned operator status view (follow-up, once Supabase is wired): a small,
admin-only page (or Supabase SQL/Studio dashboard to start) showing:

- row counts per table,
- last import timestamp + last import status,
- outstanding validation errors,
- moderation queue counts.

The contract for this lives in `OperatorService` in `contracts.ts`.

## 6. Rollout plan (incremental, non-breaking)

1. **This PR** — schema + contracts + validated import/seed + docs. App unchanged.
2. Provision Supabase; apply `0001_initial_schema.sql`; run the import from the
   validated seed dataset.
3. Implement `SupabaseServices`; wire **read-only** catalog surfaces first
   (Map/Substance/Brand/Stack) behind the service interface.
4. Move auth + user-owned writes (saved, hidden, follows, posts) with RLS.
5. Moderation + operator status view.

## Constraints honored

No production persistence wired in; the Vite build is untouched; clear service
boundaries; everything here is designed to be replaced/extended.
