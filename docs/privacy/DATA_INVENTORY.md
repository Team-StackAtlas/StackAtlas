# Data inventory & privacy architecture

**Last audited: 2026-10-20.** This is the engineering source for the Privacy
Policy (`src/content/legal/privacy.md`). When the schema changes, update this
file first, then the policy.

## Design principles

1. **Reading is nobody's business.** No page-view, search, or filter logging —
   first- or third-party. This is a hard rule, not a default: many users live
   where reading about certain compounds is itself sensitive.
2. **The access level never leaves the device.** `stackatlas_user_scope`
   (Citizen/Explorer + goals) is localStorage. Only `goals` syncs, and only for
   signed-in users, via `useGoals`. The legacy `profiles.research_scope`
   column (enum Citizen/Explorer, default 'Citizen') is **never written by the
   app** — it is dead schema. Candidate for a future `drop column`.
3. **No IPs or device identifiers in our database.** Infrastructure providers
   (Supabase auth logs, Vercel request logs) see IPs transiently; we do not
   copy them. Disclosed in Privacy Policy §4.
4. **Aggregate, not individual.** Any statistic we compute from user actions is
   a count or average over accounts; nothing published maps back to a person.
5. **Collect only what a feature needs**, with per-field visibility switches.

## Third-party audit

| Category | Finding |
|---|---|
| Analytics / tracking SDKs | **None.** `package.json` deps: supabase-js, react, react-router, tailwind, lucide, motion, react-markdown, date-fns, clsx, tailwind-merge, fflate. No gtag/GTM/PostHog/Sentry/Mixpanel/Hotjar/Vercel Analytics. |
| Third-party scripts in `index.html` | **None.** |
| Cookies | **None set by us.** Supabase auth uses localStorage. |
| Fonts | System font stack only (Tailwind default). **No Google Fonts or licensed webfonts.** |
| Images | No bundled image assets (`public/` is empty). User avatars are URLs the user supplies. Icons: Lucide (ISC). |
| Processors | Supabase (db + auth, us-west-1), Vercel (hosting). |

**Rule going forward:** adding any third-party script, SDK, font CDN, or
embedded content requires (a) a line in this table, (b) a Cookie Policy update
*before* it ships, and (c) consent gating if it sets identifiers.

## Browser storage

See the Cookie Policy table (`src/content/legal/cookies.md`) — it is the
authoritative list of localStorage keys. Keys added after this audit:
`stackatlas_palette`, `stackatlas_consent_notice`, `stackatlas_age_confirmed`.

## Database tables holding personal data

| Table | Personal data | Purpose | Linked to person? | Deleted on request? |
|---|---|---|---|---|
| `auth.users` (Supabase) | email, password hash, confirmation state, last sign-in | authentication | yes | **manual final step** (service role) |
| `profiles` | username, display_name, avatar_url, bio, website, age, sex, height, weight, body_fat_percentage, goals, settings, role, account_status | profile + preferences | yes | personal fields scrubbed immediately |
| `posts`, `post_comments` | authored content | the service | yes (author_id) | soft-deleted now; hard-deleted at purge unless others commented (then anonymized) |
| `post_votes`, `post_comment_votes`, `brand_star_ratings` | votes/ratings | ranking, integrity (one vote per account) | yes | deleted at purge |
| `saved_items`, `hidden_items`, `library_albums`, `library_album_items` | what you saved/hid/collected | personal library | yes, private | deleted immediately / at purge |
| `follows`, `follow_requests` | social graph | feed | yes | deleted immediately |
| `messages`, `conversations*`, `quarter_*` | direct & group messages | messaging | yes | **not yet covered** — see gaps |
| `notification_settings`, `notifications` | preferences, inbox | notifications | yes | settings deleted immediately; notifications cascade |
| `reports`, `moderation_queue`, `moderation_log`, `audit_events`, `admin_notes` | reporter id; admin actor id; targets | moderation integrity | yes | reports deleted at purge; admin logs retained (legitimate interest) |
| `research_*`, `substances`, `brands`, `products`, `stacks` | none (catalog/evidence) | content | no | n/a |

### Tables with no personal data
Everything in the catalog/evidence layer (`substances`, `substance_*`,
`brands`, `brand_products`, `product_*`, `research_*`, `category_routes`,
`bearings`, `glossary_terms`, `markers`, `sources`).

## Deletion flow (migration `20261020120000`)

1. User: Profile → *Delete my account and data* → `request_account_deletion()`.
   Immediate: profile PII scrubbed, posts soft-deleted, private rows removed,
   `account_status = 'deletion_requested'`, request row written.
2. Owner, periodically: `select admin_purge_deletion_requests();` — hard-deletes
   application rows for requests > 30 days old.
3. Owner, final manual step: delete the `auth.users` row (Dashboard →
   Authentication → Users, or Admin API). This is the one step the app cannot
   do because it requires the service role.

## Known gaps (prioritized)

1. **Messages** are not scrubbed by the deletion RPC. Decide: delete the
   user's messages outright, or replace body with "[deleted]" to preserve the
   other participant's thread. Then extend `request_account_deletion`.
2. **Data export** (portability) is manual on request. A `export_my_data()`
   RPC returning JSON would make Privacy Policy §6 self-service.
3. **Goal sync opt-out**: goals sync whenever signed in. Consider a settings
   toggle ("keep my goals on this device only").
4. **`profiles.research_scope`** dead column — drop it so the schema matches
   the promise.
5. **Supabase auth log retention** — confirm the provider's current retention
   so Privacy Policy §7's "typically no more than 90 days" stays true.
6. **Email sending** — `settings.emailUpdates` is collected (opt-in) but no
   mailer exists. When one is added, it becomes a processor (Policy §4) and
   every email needs a one-click unsubscribe that flips the flag.
