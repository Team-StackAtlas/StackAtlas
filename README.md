# StackAtlas

A community platform for supplements, peptides, and nootropics — community
reviews, dosage and protocol info, brand reliability ratings, personal intake
logging, and side-by-side comparison tools.

> **Status: early-stage prototype.** The app is currently a client-only
> single-page application. All content (substances, stacks, brands, posts) is
> served from local mock/seed data and user activity (logs, notes, saves,
> roles) is persisted to the browser's `localStorage`. There is **no backend or
> database yet**.

## Concepts

- **Classification** — each substance has one of four classifications:
  **Everyday**, **Clinical**, **Frontier**, or **Unknown**. These describe how
  established or experimental a substance is and carry no legal meaning.
- **Research scope** — chosen during onboarding, acts as an access ceiling over
  classifications:
  - **Citizen** sees Everyday and Clinical.
  - **Explorer** sees Everyday, Clinical, Frontier, and Unknown.

## Features

- **Map** — browse and search the substance/stack/brand catalog with filtering
  by type, administration method, and classification (gated by research scope).
- **Square** — a community feed of posts, dispatches, and signals.
- **Lab** — side-by-side comparison tools for substances, brands, and stacks.
- **Comms** — a mock inbox / notifications surface.
- **Profile** — saved items, your stacks, role-specific panels, and research
  scope.
- **Logging** — record intake logs and private notes.
- **Compare** — side-by-side comparison with similarity suggestions.

Supporting UX: light/dark theme (respects system preference), role-based UI,
and an onboarding flow.

## Tech stack

- **React 19** + **TypeScript**
- **Vite 6** (dev server + build)
- **React Router 7** for routing
- **Tailwind CSS 4** for styling
- `lucide-react`, `motion`, `date-fns`, `react-markdown`, `clsx`,
  `tailwind-merge`

## Getting started

**Prerequisites:** Node.js 18+ and npm.

```bash
# 1. Install dependencies
npm install

# 2. Run the dev server (http://localhost:3000)
npm run dev
```

## Scripts

| Script                 | Description                                  |
| ---------------------- | -------------------------------------------- |
| `npm run dev`          | Start the Vite dev server on port 3000.      |
| `npm run build`        | Production build to `dist/`.                 |
| `npm run preview`      | Preview the production build locally.        |
| `npm run typecheck`    | Type-check with `tsc --noEmit`.              |
| `npm run lint`         | Lint with ESLint.                            |
| `npm run format`       | Format the codebase with Prettier.           |
| `npm run format:check` | Check formatting without writing changes.    |
| `npm run clean`        | Remove the `dist/` build output.             |

Continuous integration (`.github/workflows/ci.yml`) runs the type-check, lint,
and build on every pull request.

## Project structure

```
src/
  pages/         Route-level screens (Map, Square, Ledger, Lab, Profile, ...)
  components/    Reusable UI (cards, modals, buttons, layout)
  context/       React context providers (theme, logs, user scope, filters, roles)
  hooks/         Custom hooks (saved items, hidden items, mock comms)
  data/          Mock catalog data and seed posts
  lib/           Shared utilities
```

The `scrape.js`, `update_mock.cjs`, and `update_tags.cjs` files in the repo root
are one-off data/maintenance scripts used while building out the mock dataset.

## Roadmap / known gaps

This is a prototype, and several things are intentionally not done yet:

- A real backend + database (data is currently mock + `localStorage`).
- Region-aware information (deferred; not part of v1).
- An automated test suite (the current `tests/` contains a scraping utility, not
  real tests).
- Burning down the remaining ESLint warnings (e.g. `any` usage, unused vars) and
  ratcheting them back up to errors.

## Origin

This project was scaffolded with Google AI Studio.
