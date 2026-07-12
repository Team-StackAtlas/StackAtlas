# Migration history notes

The production migration history diverged from this directory during the
run-based research era (PRs 43–48 and their reverts). Reconciliation happened
in July 2026:

- Remote `0006` is named `community_posts`; the local `0006_library.sql`
  shares the version number but the library tables were never applied to
  production (known gap, tracked as a launch blocker).
- Remote `0014` is `admin_research_substance_picker_foundation` (from the
  reverted run-based work). The local `0014_owner_bulk_research_sources.sql`
  and `0015_repair_research_source_ingestion.sql` were never run against
  production; their intended state is fully covered by the idempotent
  convergence migration `20260711190452_research_import_system.sql`. Version
  `0015` is marked applied in the remote history via repair so `db push`
  never attempts to run it against production (it would fail and recreate
  superseded functions).
- Fresh environments replay this directory in order and end at the same
  state: the convergence migration is idempotent from either history.

When adding migrations, use `supabase migration new` style timestamp
versions (YYYYMMDDHHMMSS_name.sql) and apply them through the Supabase MCP
or CLI so the recorded version matches the filename.
