-- Account/profile additions: role, avatar, settings, and an auto-profile trigger.

create type user_role as enum ('User', 'Admin', 'Developer');

alter table profiles
  add column if not exists role user_role not null default 'User',
  add column if not exists avatar_url text,
  -- privacy / settings preferences (e.g. { "savedPrivate": true, "showActivity": false })
  add column if not exists settings jsonb not null default '{}'::jsonb;

-- Convenience counts for a profile (derive, never store).
create or replace view profile_stats as
select
  p.id,
  (select count(*) from follows f where f.target_type = 'user' and f.target_id = p.id::text) as followers_count,
  (select count(*) from follows f where f.follower_id = p.id) as following_count,
  (select count(*) from posts po where po.author_id = p.id and po.kind = 'dispatch') as dispatch_count,
  (select count(*) from posts po where po.author_id = p.id and po.kind = 'signal') as signal_count
from profiles p;

-- Create a profile row automatically when an auth user is created (Supabase).
-- Username defaults to the email local-part; users can change it later.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email) values (new.id, new.email)
    on conflict (id) do nothing;
  insert into public.profiles (id, username)
    values (new.id, split_part(coalesce(new.email, new.id::text), '@', 1))
    on conflict (id) do nothing;
  return new;
end;
$$;

-- Supabase exposes auth.users; attach the trigger there.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
