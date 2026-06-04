<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# StackAtlas

A community platform for supplements, peptides, and nootropics — verified user
reviews, dosage and protocol info, brand reliability ratings, personal intake
logging, and AI-assisted research tools.

> **Status: early-stage prototype.** The app is currently a client-only
> single-page application. All content (substances, stacks, brands, posts) is
> served from local mock/seed data and user activity (logs, notes, saves,
> roles) is persisted to the browser's `localStorage`. There is **no backend or
> database yet**. The only live external integration is the Gemini-powered
> research assistants.

## Features

- **Map** — browse and search the substance/stack/brand catalog with advanced
  filtering (administration method, status, access level, region).
- **Square** — a community feed of posts, dispatches, and signals.
- **Ledger** — track verifications, reports, and moderation activity.
- **Lab** — AI research assistants (powered by Google Gemini) for questions
  about supplements and protocols.
- **Comms** — a mock inbox / notifications surface.
- **Profile** — saved items, your stacks, role-specific panels, and account
  scope (access level + region).
- **Logging** — record intake logs and private notes, viewable on a calendar.
- **Compare** — side-by-side comparison of substances/stacks with similarity
  suggestions.

Supporting UX: light/dark theme (respects system preference), role-based UI,
region scoping, and an onboarding flow.

## Tech stack

- **React 19** + **TypeScript**
- **Vite 6** (dev server + build)
- **React Router 7** for routing
- **Tailwind CSS 4** for styling
- **Google Gemini** (`@google/genai`) for the Lab assistants
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

### Enabling the AI assistants (optional)

The Lab assistants call the Gemini API. The key is read at runtime from
`window.__APP_CONFIG__` in [`index.html`](index.html) so it is not baked into
the built JS bundle. To try the assistants locally, set the value there:

```html
<script>
  window.__APP_CONFIG__ = {
    GEMINI_API_KEY: 'your-key-here',
  };
</script>
```

> ⚠️ **Security note:** the Gemini call currently happens **client-side**, so
> any key placed here is visible to the browser. This is acceptable for local
> prototyping only. **Do not ship a real key this way in production** — the
> call must be moved behind a server-side proxy first (tracked as a TODO in the
> code).

The rest of the app works without a key; only the Lab assistants require one.

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
index.html       App shell + runtime config (window.__APP_CONFIG__)
```

The `scrape.js`, `update_mock.cjs`, and `update_tags.cjs` files in the repo root
are one-off data/maintenance scripts used while building out the mock dataset.

## Roadmap / known gaps

This is a prototype, and several things are intentionally not done yet:

- A real backend + database (data is currently mock + `localStorage`).
- A server-side proxy for the Gemini API key.
- An automated test suite (the current `tests/` contains a scraping utility, not
  real tests).
- Burning down the remaining ESLint warnings (e.g. `any` usage, unused vars) and
  ratcheting them back up to errors.

## Origin

This project was scaffolded with Google AI Studio.
