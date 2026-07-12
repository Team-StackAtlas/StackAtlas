# StackAtlas

A substance, supplement, stack, brand, research, and community intelligence
platform — structured fact-first discovery, community experience reports,
comparison tools, and an admin-reviewed research pipeline.

> **Status: pre-launch.** The frontend is a React SPA hosted on Vercel; data
> persists to Supabase (Postgres + RLS). The public catalog (substances,
> brands, stacks) is served from Supabase when configured and falls back to
> bundled seed data otherwise. Accounts, profiles, saves, follows,
> notifications, moderation, and the research import system are
> Supabase-backed.

## Product areas

- **Map** — fact-first discovery: browse and search substances, brands, and
  stacks with filtering by type, administration method, and classification.
- **Square** — the community feed: Dispatches (structured experience reports)
  and Signals (freeform posts), with comments, likes, and saves.
- **Create** — authoring flow for Dispatches and Signals.
- **Library** — the user's saved and followed world.
- **Lab** — side-by-side comparison workspace for substances, brands, and
  stacks.
- **Notifications** — event inbox (replies, likes, report updates).
- **Comms** — conversations: DMs, message requests, Quarters.
- **Admin** (admins only) — moderation, reports, users, Quarters controls,
  and Research: the data-pack import system (import wizard, source library,
  findings, import history).

## Concepts

- **Classification** — each substance is **Everyday**, **Clinical**,
  **Frontier**, or **Unknown**, describing how established or experimental it
  is. No legal meaning.
- **Research scope** — chosen during onboarding, acts as an access ceiling:
  **Citizen** sees Everyday and Clinical; **Explorer** sees everything.
- **Language guardrails** — public copy uses reported/community framing
  ("reported dose ranges", "possible risks"), never recommendations or
  medical advice.

## Research & data import

Catalog and research data is ingested through versioned **Data Packs** — JSON
files (typically generated externally with cheaper AI models) validated and
imported through Admin → Research. The pipeline: parse → per-row validation →
dedup preview against natural keys (slugs, PMID/DOI/URL) → chunked import via
SECURITY DEFINER Postgres RPCs → batch audit history. Findings always land as
`pending_review` and never publish automatically.

- Operator manual and prompt templates: `docs/data-packs/`
- Architecture and audit history: `docs/research-import/AUDIT-AND-PLAN.md`
- Database schema: `supabase/migrations/`

## Tech stack

- **React 19** + **TypeScript**, **Vite 6**, **React Router 7**,
  **Tailwind CSS 4**
- **Supabase** (Postgres, Auth, RLS) for persistence; **Vercel** for hosting
- `@supabase/supabase-js`, `lucide-react`, `motion`, `date-fns`,
  `react-markdown`, `clsx`, `tailwind-merge`

## Getting started

**Prerequisites:** Node.js 18+ and npm.

```bash
# 1. Install dependencies
npm install

# 2. Configure Supabase (optional — the app runs on bundled seed data without it)
cp .env.example .env   # then fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Run the dev server (http://localhost:3000)
npm run dev
```

Without Supabase env vars the app runs in local/seed mode: the catalog comes
from `src/data/mockData.ts` and account features are disabled.

## Scripts

| Script                  | Description                                        |
| ----------------------- | -------------------------------------------------- |
| `npm run dev`           | Start the Vite dev server on port 3000.            |
| `npm run build`         | Production build to `dist/`.                       |
| `npm run preview`       | Preview the production build locally.              |
| `npm run typecheck`     | Type-check with `tsc --noEmit`.                    |
| `npm run lint`          | Lint with ESLint.                                  |
| `npm run format`        | Format the codebase with Prettier.                 |
| `npm run format:check`  | Check formatting without writing changes.          |
| `npm run clean`         | Remove the `dist/` build output.                   |
| `npm run pack:from-mock`| Export the bundled seed catalog as a Data Pack.    |
| `npm run seed:validate` | Dry-run validation of the bundled seed dataset.    |
| `npm run seed:sql`      | Generate `supabase/seed.sql` from the seed data.   |

Continuous integration (`.github/workflows/ci.yml`) runs the type-check, lint,
and build on every pull request.

## Project structure

```
src/
  pages/         Route-level screens (Map, Square, Create, Library, Lab, Admin, ...)
  components/    Reusable UI (cards, modals, layout; components/admin for Admin)
  context/       React context providers (auth, catalog, theme, logs, filters)
  services/      Service layer: supabase adapters, catalog loader, import engine
  hooks/         Custom hooks (saved items, hidden items)
  data/          Bundled seed catalog and seed posts (fallback/dev mode)
  lib/           Shared utilities
supabase/
  migrations/    Postgres schema, RLS policies, and import RPCs
docs/
  data-packs/    Data Pack format, prompt templates, sample packs
  research-import/  Research system audit and plan
```

The `scrape.js`, `update_mock.cjs`, and `update_tags.cjs` files in the repo
root are one-off scripts kept from the original mock-data era.

## Roadmap / known gaps

- Wire the remaining content surfaces (Square posts, Library persistence) to
  Supabase; Library tables are not yet applied in production.
- Findings review queue actions (approve/reject) in Admin → Research.
- Public research sections once approved findings exist.
- An automated test suite (the current `tests/` contains a scraping utility,
  not real tests).
- Burning down the remaining ESLint warnings and ratcheting them back to
  errors.
