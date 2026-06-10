-- Ensure Supabase Auth users always have the public user/profile rows the app loads after login.

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  requested_username text := lower(nullif(new.raw_user_meta_data->>'username', ''));
  fallback_username text := 'user_' || left(replace(new.id::text, '-', ''), 19);
begin
  insert into public.users (id, email) values (new.id, new.email)
    on conflict (id) do update set email = excluded.email;

  if requested_username is null or requested_username !~ '^[a-z0-9_]{3,24}$' then
    requested_username := fallback_username;
  end if;

  insert into public.profiles (id, username, settings)
    values (new.id, requested_username, '{}'::jsonb)
    on conflict (id) do nothing;
  return new;
exception when unique_violation then
  insert into public.profiles (id, username, settings)
    values (new.id, fallback_username, '{}'::jsonb)
    on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

insert into public.users (id, email)
select au.id, au.email
from auth.users au
on conflict (id) do update set email = excluded.email;

insert into public.profiles (id, username, settings)
select au.id, 'user_' || left(replace(au.id::text, '-', ''), 19), '{}'::jsonb
from auth.users au
left join public.profiles p on p.id = au.id
where p.id is null
on conflict (id) do nothing;
