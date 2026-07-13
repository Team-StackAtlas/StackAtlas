-- Realtime delivery for Comms: add the comms tables to the supabase_realtime
-- publication so postgres_changes subscriptions (see useComms.ts) get
-- pushed INSERT/UPDATE events instead of relying solely on the 15s poll.
--
-- Realtime's postgres_changes still enforces each table's RLS policies
-- (via the fix_comms_rls_recursion helpers), so a subscriber only ever
-- receives events for rows they're already allowed to select -- members-
-- only visibility is unchanged. The client (useComms) does not read event
-- payloads; it treats any event as a signal to re-run refresh(), which is
-- the existing RLS-scoped loadComms/loadQuarters path.
--
-- Replica identity is intentionally left at its default. RLS on
-- postgres_changes is evaluated against the row as written (the new tuple
-- for INSERT/UPDATE), which is always fully present in the WAL regardless
-- of replica identity; FULL is only needed for old-row data on UPDATE/
-- DELETE, which nothing here subscribes to or requires.
--
-- Guarded with DO blocks checking pg_publication_tables so this migration
-- is safe to re-run.

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'quarter_messages'
  ) then
    alter publication supabase_realtime add table quarter_messages;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table conversations;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'quarter_invites'
  ) then
    alter publication supabase_realtime add table quarter_invites;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversation_participants'
  ) then
    alter publication supabase_realtime add table conversation_participants;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'quarter_members'
  ) then
    alter publication supabase_realtime add table quarter_members;
  end if;
end $$;

notify pgrst, 'reload schema';
