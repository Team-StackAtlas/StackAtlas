# StackAtlas — Handoff Master File (July 23, 2026)

Living handoff document for the autonomous "big push" development session.
Covers: everything shipped, everything in flight, every open problem (blocked,
unsure, or deliberately deferred), plus the operational playbooks needed to
continue the work without this session's context.

- **Repo:** `Team-StackAtlas/StackAtlas`
- **Working branch:** `claude/research-source-system-bmu9wg` (all work lands here, ships via squash-merge PRs to `main`, branch resets from `origin/main` after every merge)
- **Session date:** July 23, 2026 (UTC)
- **PRs merged this session:** 30 (approx. #131–#159; see ledger below).

---

## 1. Executive overview

StackAtlas is a supplement / peptide / nootropic research social app (React 19 +
Vite + Tailwind class-based dark mode + Supabase backend + react-router). It has
two operating modes:

- **Backed mode** — `.env` present → `isBackendConfigured === true` → Supabase
  auth, Postgres tables, RPCs, RLS. Real accounts, persisted posts/comms/albums.
- **Mock (demo) mode** — no `.env` → seeded data from `src/data/mockData.ts` +
  `src/data/seedPosts.ts`, all mutations persist to `localStorage` via hooks.
  Every core loop is required to work fully in mock mode.

This session took the app through: a full research-data import system, three
site-wide audit/fix passes, a messenger-grade Comms rebuild, goal-based
personalization, catalog data-quality cleanup, album/library completion, a
social-identity layer (post photos + profile avatars), and ~a dozen real bug
fixes found by driving every route with Playwright in both themes and both
form factors.

**Current app health:** every route, tab, badge, and interactive flow has been
driven end-to-end at least once this session. No known broken flows remain in
mock mode. Backed mode has three features dark until the user applies three
committed migrations (see §3.1 — the single most important handoff item).

---

## 2. What shipped this session (detailed ledger)

Numbers before #135 predate a context compaction; those entries are grouped by
theme rather than exact PR number. Everything from #135 on is exact.

### 2.1 Research/source import system (early session)
- **Full audit** of the research/source data layer; findings doc'd in-session.
- **DB migration for the import system** (substances, research_runs,
  research_sources, research_extracted_notes, research_source_substances,
  type tags, markers, routes, aliases; slug-based resolution helpers
  `import_slugify` / `import_resolve_substance`).
- **Importer engine**: ZIP parse → validate → dedupe → upsert. Admin Research
  UI rebuilt around it (drop a ZIP in, get a clean import report).
- **AI data-pack generation kit** — authoring guide + schema so ChatGPT/Claude
  can produce import-ready substance packs.
- **Imported the combined research package (chunks 1–11)** → 45 unique
  substances in prod.

### 2.2 Site-wide UI passes (x.com / Instagram-inspired)
- **Substance & brand cards** rebuilt (#135): name-first bold typography,
  acronym-first display via `src/lib/substanceName.ts` (`displayName()` returns
  `{primary, acronym, altNames}`), classification pill (omits "Unknown" — this
  killed the "?" badge complaint), shipping info demoted to a quiet footer,
  contamination surfaced with ShieldCheck/ShieldAlert.
- **Root error boundary** (#137): `src/components/AppErrorBoundary.tsx` class
  component wraps lazy routes; auto-reloads once on chunk-load errors
  (sessionStorage-throttled, 10s window). Fixed the blank-white-page nav glitch.
- **Substance page** (#138): two-column layout
  (`lg:grid-cols-[minmax(0,1fr)_340px]`), sticky "At a glance" rail (dose panel,
  cycle, tolerance, risk, most-popular brand), boxy FactTiles removed,
  acronym-first `<h1>`.
- **Square right rail** (#139, #142): Discover card first (most-discussed +
  suggested-to-follow, goal-aware ordering), Trending bearings demoted below.
- **Compare** rebuilt then polished (#15x series): differences-first design
  (identical facts get a "Same" tag and muted styling; list data split into
  shared-vs-unique chip groups), sticky identity bar (`top-16 md:top-20`),
  hero picker with VS badge, and (#151) **relevance-ranked second pick** —
  after picking substance A, candidates sort by known `possiblePairings` (both
  directions, +4 each) plus shared canonical-category count; brands/stacks keep
  catalog order.
- **Category rails** (#153): scroll paddles/affordance + goal-first category
  ordering on the Map and Square rails; fixed dead notification links.
- **Mock glossary** (#142): 16 seed terms so the Glossary isn't empty in demo.

### 2.3 Comms — messenger-grade rebuild
- (#140) **Role badges** — `QuarterRoleBadge`: Crown = Quartermaster (owner),
  Shield = Mod (adminIds). Shown in quarter headers and on message bubbles.
- (#140) **GIF/image support everywhere** — attachments across DMs and
  Quarters (png/jpeg/webp/gif/pdf/txt; 5 MB images, 10 MB persisted files).
- (#143) **Two-pane messenger shell** — conversation list + thread pane,
  message grouping (consecutive same-sender messages cluster; avatar and
  sender line only on the first of a run), auto-scroll to newest
  (`messagesEndRef`), Enter-to-send, mobile thread open/close state
  (`mobileThreadOpen`), quarter Info panel.
- (#151) **Bottom-anchored threads** — both DM and Quarter scroll panes wrap
  messages in `flex min-h-full flex-col justify-end`; short conversations hug
  the composer like every real messenger instead of floating at the top.
- (#151) **Broken-image fallback** — `MessageImage` component catches img
  `onError` and renders a labeled tile (ImageOff icon + filename) instead of
  the browser's broken-image glyph (mock attachment paths and expired signed
  URLs both hit this).
- (#151) **Context-aware sidebar search** — on the Quarters tab the single
  search box now filters quarters by title/description (placeholder "Search
  quarters"); Chats/Requests keep the start-a-DM user search. Previously DM
  user results leaked into the Quarters tab.

### 2.4 Personalization
- (#145 + #149) **Goals**: 12 canonical categories (`BEARING_CATEGORIES`:
  Cognition, Recovery, Performance, Longevity, Mood & Stress, Metabolic
  Health, Hormonal Health, Digestive Health, Heart Health, Pain & Injury,
  Joint & Mobility, Beauty & Skin). Shared `GoalsPicker` grid used by a new
  **onboarding goals step** (scope → goals → Map) and a "Your goals" card on
  the own-profile page. `useGoals` hook: localStorage is the working set;
  best-effort profile sync for signed-in users (survives the missing DB column
  gracefully — see §3.1).
- (#141) **Goal-based For You ranking** on the Map (goal-category overlap
  boost via `getCanonicalCategories`) and goal-aware Discover suggestions on
  the Square rail. Square feed applies a goal boost before the chosen sort.
- (#144) **Category inference for imported substances** —
  `src/lib/categoryInference.ts` maps research-area keywords → canonical
  categories; `services/catalog` synthesizes `paths` at load time when a DB
  substance has none (verified: all 45 imported substances categorize, 0
  uncategorized). No DB write needed; mock-safe.

### 2.5 Data quality
- (#150) **Catalog cleanup migration (committed, NOT applied)** — removes
  `probiotics` and `electrolyte-blends` (ingredient classes, not substances)
  from prod. Handles all `ON DELETE RESTRICT` children first, scoped to
  exactly those two slugs. Idempotent. See §3.1.
- (#152) **Mock parity** — removed `Probiotics (Lactobacillus)` + its two seed
  posts from mock data so demo and prod agree. "E. coli Nissle 1917": verified
  absent from every import batch (searched all 11 chunks: no nissle/e.coli/
  escherichia match) — nothing to remove; the user's question is answered by
  "it never existed in our data."

### 2.6 Library & albums
- Album per-item **notes** ("Good info on X on page Y" use case): `ItemNote`
  component on AlbumDetail (owner edit / viewer caption), share button
  (copies `/library/albums/:id` link), Make public toggle.
- (#148) **Notes sync to DB** — `library_album_items.note` column (migration
  **applied** to prod), `updateAlbumItemNote` through the service in backed
  mode / localStorage in mock, legacy-key migration
  (`stackatlas_album_item_notes` → items, key removed).
- (#155) **Album-create crash fixed** — `event.currentTarget.reset()` after an
  `await` (React nulls currentTarget once the handler yields) threw on every
  create; form element now captured pre-await (same pattern PostDetail uses).

### 2.7 Social layer
- (#154) **Author profiles resolve in mock mode** — profiles derive from post
  authors (stats, verified badge, tabbed post list), Create publishes as the
  demo user; killed the mock-mode dead-ends.
- (#155) **Following feed works in mock mode** — the feed gated on a signed-in
  `user`, which mock never has; follows persisted but the tab stayed empty
  forever. Gate now applies only when the backend is configured.
- (#156) **Notification badge sync** — Layout's sidebar badge and the
  Notifications page each own a `useNotifications` instance; Mark-all-read
  desynced them until reload. `writeLocal` now dispatches
  `stackatlas:notificationsChanged` and all instances refresh on it (same
  pattern as `useSaved`). Also removed the **dead Albums chip** from the
  Following filter (match logic can never label a post album-linked — see
  §3.5.1).
- (#157) **Post photos** — optional image on Dispatches and Signals. Create
  forms get an "Add photo" picker (preview, remove, type/size validation,
  client-side downscale to max-1280px JPEG data-url). Renders in the Square
  feed card (capped cover, lazy) and post detail (full contain). Backed mode
  degrades gracefully until its migration is applied (see §3.1): the
  `create_post` RPC ignores the unknown `image_url` payload key, and the
  posts read retries without the column.
- (#158 — MERGED) **Profile photo upload + author avatars** — replaces the
  raw "Avatar URL" text input with a real picker (circular preview, 256px
  downscale, Remove; tri-state draft so untouched saves keep the stored
  avatar). `profiles.avatar_url` already exists in prod → **works in backed
  mode with no migration**. Author avatars render in Square cards and post
  detail headers (fallback: initial letter). Shared
  `src/lib/imageUtils.ts:downscaleImage(file, maxDim, quality)` now backs both
  pickers. Also carries this handoff doc into the repo.
- (#159 — MERGED) **Avatar completion** — every initial-letter circle in
  Comms (message bubbles, conversation list, pending requests, thread header)
  renders the profile photo when set; both comms profile selects load
  `avatar_url`; sidebar + mobile-header Profile links show your own avatar.
- (#160 — see §4) **Post-image lightbox** — click an attached photo on the
  post page for a full-screen viewer (backdrop/Esc closes).

### 2.8 Bug-fix roll-up (found by proactive audits, all verified with Playwright)
| Bug | Root cause | Fix PR |
|---|---|---|
| Blank white page on Map/Square nav | No error boundary around lazy routes; chunk-load errors unhandled | #137 |
| Square hid all Dispatches | #132's positive-filter change left subtractive checks in Square | (audit pass 2) |
| Imported substances missing from category cards | Importer stores research areas in type_tags; no route paths | #144 |
| Comms threads top-anchored w/ dead gap | Scroll pane had no bottom-anchoring column | #151 |
| Broken-image glyph in DM bubbles | No `onError` fallback on attachment img | #151 |
| DM user-search leaking into Quarters tab | Single search box, no tab awareness | #151 |
| Compare second pick ignored first pick | Static top-8 catalog slice | #151 |
| Following feed permanently empty (mock) | `if (!user) return false` gate | #155 |
| Album create threw TypeError | `currentTarget.reset()` after `await` | #155 |
| Sidebar notif badge stale after Mark-all-read | Per-instance hook state, no cross-instance event | #156 |
| Albums filter chip could never match | Feed match logic has no album concept | #156 (removed) |
| CI build hung (in_progress, frozen `updated_at` ~18 min) | Stuck runner | cancel + empty-commit re-trigger (#148 era) |

---

## 3. OPEN PROBLEMS — blocked, unsure, or deferred

### 3.1 ⚠️ BLOCKED ON USER: three committed migrations await the DB channel
**Every Supabase MCP tool call was declined this session** (including
read-only `execute_sql`; two `apply_migration` attempts for profile_goals were
explicitly rejected, after which I stopped retrying per the signal). The
`album_item_notes` migration (#148) was applied *before* the block began; the
following three are committed to the repo but **NOT applied to prod**:

1. `supabase/migrations/20260723050000_profile_goals.sql`
   - Adds `profiles.goals text[] not null default '{}'`.
   - Until applied: goals are localStorage-only (still fully functional
     per-device); the profile-sync write fails silently by design.
   - After applied: goals follow the account across devices automatically —
     no code changes needed.
2. `supabase/migrations/20260723060000_catalog_cleanup_noncanonical_substances.sql`
   - Deletes `probiotics` + `electrolyte-blends` substances and their
     RESTRICT-linked children (research_extracted_notes,
     research_source_substances, research_sources, research_runs,
     stack_components), scoped via a temp table of exactly those two ids.
   - Transactional, idempotent, reversible only by re-import. Until applied:
     those two rows still show on the prod Map.
3. `supabase/migrations/20260723070000_post_images.sql`
   - Adds `posts.image_url text` and recreates the `create_post` RPC (same
     body as `20260713001500_posts_persistence.sql` + image_url insert).
   - Until applied: photo attach works in demo mode; in backed mode the photo
     is silently dropped at publish (RPC ignores the unknown key) and reads
     auto-retry without the column. After applied: feature lights up, no code
     changes needed.

**How to apply:** `supabase db push` from the repo, or paste each file into the
Supabase SQL editor. Order-independent, all idempotent. (Or restore my
Supabase MCP access in a future session and say "apply the three pending
migrations".)

### 3.2 Unsure / needs a product decision
- **Data-URL images vs. storage buckets.** Post photos and avatars store
  downscaled JPEG **data-urls in text columns** (posts.image_url,
  profiles.avatar_url). Deliberate: zero storage/signed-URL plumbing, works
  in both modes, survives the Supabase-blocked session. Tradeoffs: ~100–400 KB
  per row, no CDN caching, payload bloat if feeds get image-heavy. **If the
  app grows, migrate to a Supabase storage bucket + public URLs** (the Comms
  attachments already use bucket + signed-URL flow that can be copied). I did
  not build the bucket path because I couldn't create/verify buckets this
  session.
- **Trending/Most Detailed sorts are naive** (helpful+comments all-time;
  content length). Good enough for seed data; a real engagement-velocity
  ranking needs timestamps on votes, which the mock store doesn't keep.
  Decide whether that matters before real traffic.
- **Compare relevance only covers substances.** Brands/stacks keep catalog
  order (no pairing/category signal exists for them). Fine for now; flagging
  that the asymmetry is intentional.
- **Public albums are notification-stubs only.** Notifications reference
  `mock-album-peptide-research` but there is no browsable public-album entity,
  no album deep-link target (album notifications link to `/library`), and no
  album activity in the Following feed (chip removed in #156 for that
  reason). Building "public albums" properly is a full feature: entity, page,
  follow integration, feed items. Deferred — needs a green light.
- **Profile editing is backed-mode only** (existing gate `isBackendConfigured`
  on the edit form). Mock users can't edit profile/avatar. Kept as-is because
  mock profile identity is the demo user; loosening it means inventing mock
  profile persistence. Low value, but noting the asymmetry.
- **Comms message reactions** persist only for mock (non-persisted) threads;
  the backed comms schema has no reactions table. `hideReactions =
  message.persisted === true` hides them in backed mode. A reactions table +
  RLS would be needed for parity.
- **Quarter role management UI** — badges render from `ownerId`/`adminIds`,
  but there's no UI to promote/demote moderators in backed mode. Unknown
  whether the backed schema even has an admin-management RPC. Untackled.

### 3.3 Environment / infrastructure issues hit this session
- **GitHub Actions delivery lag (TODAY, ongoing risk).** Around 07:05–07:20 UTC
  pushes stopped spawning workflow runs for ~7 minutes (no run created at
  all — distinct from the hung-runner case). Remedy that worked: empty commit
  re-trigger; the run appeared late (07:19:48). Watch for both failure modes:
  (a) run exists but `updated_at` frozen while `in_progress` > 8 min → cancel
  via `actions_run_trigger`, push empty commit; (b) **no run created** minutes
  after push → empty-commit re-trigger; if still nothing, close/reopen the PR
  to force a fresh `pull_request` event.
- **Dev server dies silently in the sandbox** (happened 3+ times). Symptom:
  `curl localhost:3000` → 000/refused. Remedy: `npm run dev` in background,
  wait ~6s, re-curl. Note the port is **3000**, not Vite's default 5173.
- **`mcp__github__actions_list` returns ~427 KB dumps** that blow the context
  budget even with `per_page` filters (the filter seems ignored). Workaround:
  let it dump to file, then extract with `python3 -c "json.load(...)"` for
  just id/head_sha/status/conclusion.
- **Unsigned-commit warnings from a Stop hook** fire after every GitHub
  squash-merge (GitHub's merge commits are unsigned by us). Benign; do NOT
  try to amend shared `main` history.
- **Playwright `fullPage` screenshots** misplace fixed-position elements
  (sidebar renders mid-page) when the page has scrolled. Cosmetic artifact of
  the tooling — not an app bug; don't chase it.

### 3.4 Known minor nits (deliberately deferred, all cosmetic)
- Mobile stack-card meta wraps awkwardly ("2 / substances by / @user") on the
  third card at 390px. `whitespace-nowrap` on the count would fix; low value.
- Mobile sort/filter chip rows (`overflow-x-auto hide-scrollbar`) are
  swipeable but give no fade/affordance hint (unlike the category rails,
  which got paddles in #153). Consistency polish candidate.
- Comms message action row (Report/delete/reaction) renders at 70% opacity
  always rather than hover-only on touch devices — by design, but looks a bit
  busy in the quarter thread.
- The mock DM thread shows a perpetual "typing…" indicator under the peer
  name (seeded state). Harmless demo artifact.
- `.github` has no PR template (checked; PR bodies are hand-written).

### 3.5 Explicitly rejected/removed things (so nobody re-adds them blindly)
1. **Following-feed "Albums" filter chip** — removed in #156. Do not re-add
   until posts can actually be album-linked or album activity items exist in
   the feed.
2. **"Avatar URL" text input** — replaced by upload in #158. Don't resurrect.
3. **`Probiotics (Lactobacillus)` mock substance + its 2 seed posts** —
   removed in #152 to match the prod cleanup. `categoryInference.ts` keeps
   `probiotic`/`prebiotic` as *keywords* for Digestive Health on purpose —
   that is not a leftover.

---

## 4. In flight right now

- **Post-image lightbox + this doc refresh** — being shipped as the next PR
  (#160) right after this edit. Check `git log origin/main` for its state.
- After that, **no other code work is queued**. The buildable backlog is empty
  pending (a) the three migrations, (b) product decisions in §3.2.

---

## 5. Operational playbooks

### 5.1 Ship loop (used 28× this session)
1. Develop on `claude/research-source-system-bmu9wg` (never elsewhere).
2. `npx tsc --noEmit` + `npm run build` locally before every push.
3. Push → open PR (ready, not draft) → subscribe fires automatically → arm a
   `send_later` check-in ~8 min out.
4. On green `build` check: squash-merge via `merge_pull_request`.
5. `git fetch origin main && git checkout -B claude/research-source-system-bmu9wg
   origin/main && git push --force-with-lease origin <branch>` (safe because
   the branch only ever contains already-merged history post-squash).
6. CI checks that matter: **`build`** (required; runs typecheck, lint, build,
   unit tests, Playwright smoke). `Vercel Preview Comments` and `Supabase
   Preview` are informational (the latter always skips).

### 5.2 Verifying UI work (mock mode + Playwright)
- Script at repo root (e.g. `.t.mjs`, delete before commit), launch with
  `chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })`.
- Never run `playwright install`.
- Seed state via `context.addInitScript` before `goto`. Useful keys:
  - `theme` → `'light' | 'dark'`
  - `stackatlas_user_scope` → `{accessLevel:'Explorer', hiddenClassifications:[], goals:[...]}`
  - `stackatlas_saved` → `[{id:'p_mg_dispatch', type:'dispatch', savedAt:ISO}]`
  - `stackatlas_following` → `[{targetType:'substance', targetId:'magnesium-glycinate'}]`
  - `stackatlas_albums` / `stackatlas_album_items` / `stackatlas_notifications`
  - `stackatlas_square_tab` → `'For You' | 'Following'`
- Screenshots land in the session scratchpad (`.../scratchpad/audit3/`).
- Mobile viewport used: 390×844, `isMobile: true, hasTouch: true`.
- Gotchas: header search opens with `ControlOrMeta+k` (the visible button's
  text node is duplicated by a hidden mobile copy); Create's bearing flow is
  Open Bearing picker → Browse all Bearings → click bearing → Done.

### 5.3 Key architecture facts for whoever continues
- `isBackendConfigured` (from `services/supabase/client`) is THE mode switch.
  Any feature gate on `user` alone is a bug in mock mode (see #155).
- Posts write path (backed): `create_post(jsonb)` RPC — resolves substance
  slugs + bearing labels server-side; ignores unknown payload keys (which is
  what makes additive columns shippable ahead of their migration).
- Posts read path tolerates the missing `image_url` column by retrying with
  the legacy column list (`loadSupabasePosts`).
- Cross-instance state sync pattern: `window.dispatchEvent(new Event(K))` +
  listener → refresh. Used by `useSaved`
  (`stackatlas:savedChanged`) and `useNotifications`
  (`stackatlas:notificationsChanged`). `useMockComms` badge already syncs.
- Canonical category mapping: `ROUTE_CATEGORY_TO_CANONICAL` +
  `getCanonicalCategories()` in `src/lib/bearings.ts` (identity mappings for
  the 12 canonical names were added so already-canonical route categories pass
  through). Keyword inference for uncategorized imports:
  `src/lib/categoryInference.ts`.
- Image handling: `src/lib/imageUtils.ts:downscaleImage(file, maxDim, q=0.82)`
  → JPEG data-url. Post photos use 1280px; avatars 256px.
- Name display: `src/lib/substanceName.ts:displayName()` — acronym-first
  (regex `/^[0-9A-Z][0-9A-Z-]{1,9}$/` picks acronyms out of alias lists).

### 5.4 Standing session conventions (from the user, verbatim intent)
- Keep working continuously; don't ask which item to do next; don't stop.
- Auto-merge own PRs when the `build` check is green.
- Bigger PRs preferred over many tiny ones.
- Design bar: x.com / Instagram / Facebook quality ("1000% usable", "billion
  dollar app" standard for Comms).
- Model preference: `claude-fable-5` (user re-selects it if switched).
- Two ingredient-class entries (probiotics, electrolyte blends) are not
  substances and must not reappear.

---

## 6. Quick current-state checklist

| Item | State |
|---|---|
| All routes/flows driven in mock mode | ✅ verified this session |
| Comms (DMs + Quarters, image/GIF, badges) | ✅ shipped + verified |
| Goals onboarding + goal-ranked feeds | ✅ shipped (sync awaits migration 1) |
| Catalog cleanup (prod) | ⚠️ migration committed, NOT applied |
| Catalog cleanup (mock parity) | ✅ shipped |
| Post photos | ✅ shipped (backed persistence awaits migration 3) |
| Profile avatars (profile, feed, Comms, sidebar) | ✅ shipped (#158 + #159, no migration needed) |
| Album notes → DB | ✅ shipped AND applied |
| Supabase MCP access | ❌ blocked all session (all calls declined) |
| GitHub Actions | ⚠️ intermittent lag today; remedies in §3.3 |
| Open PRs | #160 (lightbox + doc refresh) at time of writing |
| Migrations awaiting user | `profile_goals`, `catalog_cleanup_noncanonical_substances`, `post_images` |
