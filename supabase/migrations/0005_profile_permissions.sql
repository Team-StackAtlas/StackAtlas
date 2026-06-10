-- Allow authenticated clients to manage their own StackAtlas account/profile rows.
-- RLS policies decide row ownership; these grants are the table privileges PostgREST needs first.

grant usage on schema public to authenticated;

grant select, insert, update on public.users to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.profile_stats to authenticated;

alter table public.users enable row level security;

drop policy if exists users_read_own on public.users;
create policy users_read_own on public.users for select
  using (auth.uid() = id);

drop policy if exists users_insert_own on public.users;
create policy users_insert_own on public.users for insert
  with check (auth.uid() = id);

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users for update
  using (auth.uid() = id) with check (auth.uid() = id);
