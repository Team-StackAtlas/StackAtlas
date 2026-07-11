# PR 48 research ingestion deployment and production verification

## Migration

New migration: `supabase/migrations/0015_repair_research_source_ingestion.sql`.

A Vercel deployment only proves that the frontend build was deployed. It does not prove that this Supabase migration was applied to the production database.

## Confirm production schema readiness

1. In the Supabase dashboard for the intended production project, open migration history and confirm migrations are applied through `0015_repair_research_source_ingestion.sql`.
2. Alternatively, use the Supabase CLI while linked to the production project and inspect migration history with `supabase migration list`.
3. Apply pending migrations only through the repository's reviewed Supabase workflow or the Supabase CLI, for example `supabase db push` after confirming the CLI is linked to the intended production project.

Do not commit or print secrets. The Vite frontend must use only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; no service-role key belongs in browser code.

## Vercel environment readiness

- `https://getstackatlas.vercel.app` must point at the same production Supabase project through `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Preview deployments must be checked before testing imports. If a preview deployment uses production Supabase variables, test imports write to production.
- The hostname in `VITE_SUPABASE_URL` should match the production Supabase project whose migration history contains `0015_repair_research_source_ingestion.sql`.

## Manual production verification procedure

1. Confirm the production Vercel project points to the intended Supabase project hostname.
2. Confirm `0015_repair_research_source_ingestion.sql` is present in Supabase migration history.
3. Sign in at `https://getstackatlas.vercel.app` as the stored `site_owner`.
4. Confirm substances load.
5. Parse this CSV:

```csv
substance,source_type,title,url,pmid,doi,year,journal_or_site,authors,abstract,notes
Creatine,human_study,PR 48 Creatine persistence test,https://example.com/stackatlas-pr48-creatine,PR48CREATINE,,2025,StackAtlas Test,StackAtlas Test Author,Persistence test row,Delete after verification
Ashwagandha,review,PR 48 Ashwagandha persistence test,https://example.com/stackatlas-pr48-ashwagandha,,10.0000/stackatlas-pr48-ashwagandha,2024,StackAtlas Test,StackAtlas Test Author,Persistence test row,Delete after verification
Definitely Fake Substance,human_study,PR 48 invalid substance test,https://example.com/stackatlas-pr48-invalid,,,2025,StackAtlas Test,StackAtlas Test Author,Must not import,Invalid test row
```

6. Confirm the two real rows display their values and become `Ready` if those substances exist.
7. Confirm the fake substance is `Unknown Substance` and cannot import.
8. Import the ready rows.
9. Refresh the page and confirm they remain in Source Library.
10. Confirm the corresponding rows exist in `research_sources`.
11. Confirm the corresponding links exist in `research_source_substances`.
12. Confirm `research_import_batches` contains the actual completed counts.
13. Parse and import the same CSV again and confirm no duplicate source rows or substance links are created.
14. Delete the clearly labeled test records after verification if appropriate.

If Creatine or Ashwagandha does not exist in the production `substances` table, do not seed it silently for this PR. Use two substances that genuinely exist and report the missing catalog data as a prerequisite.

## Codex production checks

Codex can inspect and build this repository, but it cannot prove the live production Supabase migration history or complete authenticated production writes unless production credentials and a stored `site_owner` session are explicitly available in the environment. This PR therefore includes the exact manual verification steps above.
