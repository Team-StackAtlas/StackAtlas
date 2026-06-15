-- PR 5: structured in-app notifications and owner-only permissions.

alter table notifications add column if not exists recipient_id uuid references users (id) on delete cascade;
update notifications set recipient_id = user_id where recipient_id is null;
alter table notifications alter column recipient_id set not null;
alter table notifications add column if not exists actor_id uuid references users (id) on delete set null;
alter table notifications add column if not exists category text not null default 'likes';
alter table notifications add column if not exists target_type text;
alter table notifications add column if not exists target_id text;
alter table notifications add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists notification_settings (
  user_id uuid primary key references users (id) on delete cascade,
  likes boolean not null default true,
  comments boolean not null default true,
  follows boolean not null default true,
  mentions boolean not null default true,
  albums boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table notification_settings enable row level security;
drop policy if exists notification_settings_owner on notification_settings;
create policy notification_settings_owner on notification_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists notifications_owner on notifications;
create policy notifications_owner on notifications for select
  using (auth.uid() = recipient_id or auth.uid() = user_id);
create policy notifications_owner_update on notifications for update
  using (auth.uid() = recipient_id or auth.uid() = user_id)
  with check (auth.uid() = recipient_id or auth.uid() = user_id);

create or replace function create_notification(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_kind text,
  p_category text,
  p_title text,
  p_body text default null,
  p_link text default null,
  p_target_type text default null,
  p_target_id text default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_enabled boolean;
begin
  if p_recipient_id is null or p_recipient_id = p_actor_id then
    return null;
  end if;

  select case p_category
    when 'likes' then likes
    when 'comments' then comments
    when 'follows' then follows
    when 'mentions' then mentions
    when 'albums' then albums
    else true
  end into v_enabled
  from notification_settings
  where user_id = p_recipient_id;

  if coalesce(v_enabled, true) = false then
    return null;
  end if;

  insert into notifications (user_id, recipient_id, actor_id, kind, category, title, body, link, target_type, target_id, metadata)
  values (p_recipient_id, p_recipient_id, p_actor_id, p_kind, p_category, p_title, p_body, p_link, p_target_type, p_target_id, p_metadata)
  returning id into v_id;
  return v_id;
end;
$$;

grant select, update on notifications to authenticated;
grant select, insert, update on notification_settings to authenticated;
grant execute on function create_notification(uuid, uuid, text, text, text, text, text, text, text, jsonb) to authenticated;
