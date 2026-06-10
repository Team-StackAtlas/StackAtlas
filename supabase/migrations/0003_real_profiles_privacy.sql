-- Real account/profile completion, private body fields, privacy toggles, and
-- username enforcement for live Supabase-backed accounts.

alter table profiles
  add column if not exists age numeric,
  add column if not exists weight numeric,
  add column if not exists height numeric,
  add column if not exists sex text,
  add column if not exists body_fat_percentage numeric,
  add column if not exists username_last_changed_at timestamptz;

alter table profiles
  drop constraint if exists profiles_username_format,
  add constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,24}$'),
  drop constraint if exists profiles_age_check,
  add constraint profiles_age_check check (age is null or (age >= 13 and age <= 120)),
  drop constraint if exists profiles_body_fat_check,
  add constraint profiles_body_fat_check check (body_fat_percentage is null or (body_fat_percentage >= 0 and body_fat_percentage <= 100));

update profiles
set username = lower(regexp_replace(username, '[^a-zA-Z0-9_]', '_', 'g'))
where username <> lower(username) or username !~ '^[a-z0-9_]{3,24}$';

create unique index if not exists profiles_username_lower_unique on profiles (lower(username));

update profiles
set settings = jsonb_build_object(
  'savedPrivate', true,
  'showActivity', coalesce((settings->>'showActivity')::boolean, false),
  'showAvatar', coalesce((settings->>'showAvatar')::boolean, false),
  'showAge', coalesce((settings->>'showAge')::boolean, false),
  'showWeight', coalesce((settings->>'showWeight')::boolean, false),
  'showHeight', coalesce((settings->>'showHeight')::boolean, false),
  'showSex', coalesce((settings->>'showSex')::boolean, false),
  'showBodyFat', coalesce((settings->>'showBodyFat')::boolean, false),
  'showFollowers', coalesce((settings->>'showFollowers')::boolean, false),
  'showFollowing', coalesce((settings->>'showFollowing')::boolean, false),
  'showBodyStats', coalesce((settings->>'showBodyStats')::boolean, false)
)
where settings is null or not (settings ? 'showBodyStats');

create or replace function enforce_profile_username_rules() returns trigger
language plpgsql as $$
begin
  new.username := lower(trim(new.username));

  if new.username !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'profiles_username_format';
  end if;

  if tg_op = 'UPDATE' and new.username is distinct from old.username then
    if old.username_last_changed_at is not null and old.username_last_changed_at > now() - interval '30 days' then
      raise exception 'username_change_cooldown';
    end if;
    new.username_last_changed_at := now();
  end if;

  new.settings := jsonb_build_object(
    'savedPrivate', true,
    'showActivity', coalesce((new.settings->>'showActivity')::boolean, false),
    'showAvatar', coalesce((new.settings->>'showAvatar')::boolean, false),
    'showAge', coalesce((new.settings->>'showAge')::boolean, false),
    'showWeight', coalesce((new.settings->>'showWeight')::boolean, false),
    'showHeight', coalesce((new.settings->>'showHeight')::boolean, false),
    'showSex', coalesce((new.settings->>'showSex')::boolean, false),
    'showBodyFat', coalesce((new.settings->>'showBodyFat')::boolean, false),
    'showFollowers', coalesce((new.settings->>'showFollowers')::boolean, false),
    'showFollowing', coalesce((new.settings->>'showFollowing')::boolean, false),
    'showBodyStats', coalesce((new.settings->>'showBodyStats')::boolean, false)
  );

  return new;
end;
$$;

drop trigger if exists profiles_username_rules on profiles;
create trigger profiles_username_rules
  before insert or update on profiles
  for each row execute function enforce_profile_username_rules();

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  requested_username text := lower(nullif(new.raw_user_meta_data->>'username', ''));
  fallback_username text := 'user_' || replace(left(new.id::text, 8), '-', '');
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

-- Reports and edit suggestions accept app object identifiers/slugs as text.
alter table reports alter column target_id type text using target_id::text;
alter table suggest_edits alter column target_id type text using target_id::text;

alter table reports enable row level security;
alter table suggest_edits enable row level security;

drop policy if exists reports_authenticated_insert on reports;
create policy reports_authenticated_insert on reports for insert
  with check (auth.uid() is not null and reporter_id = auth.uid());

drop policy if exists suggest_edits_authenticated_insert on suggest_edits;
create policy suggest_edits_authenticated_insert on suggest_edits for insert
  with check (auth.uid() is not null and user_id = auth.uid());
