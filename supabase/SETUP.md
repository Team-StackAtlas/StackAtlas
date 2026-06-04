# Supabase setup

Everything needed to turn on accounts/backend later. The app is **env-gated**:
without the two env vars it runs offline with mock data; with them, accounts
activate. Nothing here changes the running app until you set the env vars.

## Files

- `migrations/0001_initial_schema.sql` — full catalog + community schema.
- `migrations/0002_account.sql` — accounts (role/avatar/settings), `profile_stats`
  view, and the `on_auth_user_created` trigger.
- `seed.sql` — generated catalog seed (controlled vocab, substances, brands +
  products, stacks, sources). Regenerate with `npm run seed:sql`. Safe to re-run.

## Option A — Dashboard (fastest)

1. Create a project at https://supabase.com → **New project**. Pick a region and
   DB password.
2. **Settings → API**: copy the **Project URL** and the **anon public** key.
3. **SQL Editor → New query**: paste and run, in order:
   - `migrations/0001_initial_schema.sql`
   - `migrations/0002_account.sql`
   - `seed.sql`
4. **Authentication → Providers**: ensure **Email** is enabled. For quick local
   testing you may turn off "Confirm email" (Authentication → Settings).
5. Create `.env.local` in the repo root (see `.env.example`):
   ```
   VITE_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
   VITE_SUPABASE_ANON_KEY="YOUR_ANON_PUBLIC_KEY"
   ```
6. `npm run dev` → the Login page now creates/sign-in real accounts; a profile
   row is auto-created by the trigger.

## Option B — Supabase CLI

```bash
npm i -g supabase            # or use npx
supabase init                # creates supabase/config.toml (CLI-version specific)
supabase link --project-ref <your-ref>
supabase db push             # applies migrations/*.sql
# seed:
supabase db execute --file supabase/seed.sql   # or paste seed.sql in the SQL editor
```
Then set `.env.local` as in Option A, step 5.

## Verify

- Sign up on `/login` → a `profiles` row appears (username = email local-part).
- `select * from profile_stats;` returns counts.
- Catalog tables are populated (`select count(*) from substances;` → 17).

## Notes

- **RLS**: starter policies are in `0001` (owner-only saved/hidden/follows/
  notifications/votes/ratings; public profile read). Review before going public —
  search `TODO(rls)`.
- **Row counts / import status / validation**: `npm run seed:validate` is the
  operator dry-run; it must report no issues before seeding.
- Catalog reads/writes in the UI still use mock data + the localStorage dev
  fallback hooks; wiring those to the Supabase services is the next integration
  step (the services already exist in `src/services/supabase`).
