-- PR 8: site admin roles, report/suggest-edit review, soft deletion, and Quarter controls.

alter table profiles add column if not exists site_role text not null default 'user';
alter table profiles add column if not exists account_status text not null default 'active';
alter table profiles add constraint profiles_site_role_check check (site_role in ('user', 'site_admin', 'site_owner')) not valid;
alter table profiles add constraint profiles_account_status_check check (account_status in ('active', 'warned', 'suspended', 'banned')) not valid;

update profiles
set site_role = 'site_owner'
where lower(username) = 'domonic'
   or id in (select id from users where lower(email) = 'matadomonic@gmail.com');

alter table reports drop constraint if exists reports_target_type_check;
alter table reports add constraint reports_target_type_check check (target_type in ('post', 'comment', 'reply', 'profile', 'album', 'quarter_message'));
alter table reports drop constraint if exists reports_status_check;
alter table reports add constraint reports_status_check check (status in ('pending', 'reviewed', 'action_taken', 'rejected'));
alter table reports add column if not exists reported_user_id uuid references users(id) on delete set null;

alter table suggest_edits drop constraint if exists suggest_edits_status_check;
alter table suggest_edits add constraint suggest_edits_status_check check (status in ('pending', 'reviewed', 'approved', 'rejected'));

create table if not exists admin_notes (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references users(id) on delete set null default auth.uid(),
  target_type text not null,
  target_id uuid not null,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists moderation_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references users(id) on delete set null default auth.uid(),
  action_type text not null,
  target_type text not null,
  target_id uuid not null,
  related_report_id uuid references reports(id) on delete set null,
  related_suggest_edit_id uuid references suggest_edits(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['posts','comments','replies','profiles','library_albums','quarter_messages'] loop
    if to_regclass(t) is not null then
      execute format('alter table %I add column if not exists deleted_at timestamptz', t);
      execute format('alter table %I add column if not exists deleted_by uuid references users(id)', t);
      execute format('alter table %I add column if not exists deletion_reason text', t);
      execute format('alter table %I add column if not exists restored_at timestamptz', t);
      execute format('alter table %I add column if not exists restored_by uuid references users(id)', t);
    end if;
  end loop;
end $$;

alter table quarter_members alter column role type text using case role::text when 'owner' then 'quarter_owner' when 'admin' then 'quarter_moderator' else 'quarter_member' end;
alter table quarter_members alter column role set default 'quarter_member';
alter table quarter_members drop constraint if exists quarter_members_role_check;
alter table quarter_members add constraint quarter_members_role_check check (role in ('quarter_owner', 'quarter_moderator', 'quarter_member'));

create or replace function is_site_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p where p.id = auth.uid() and p.site_role in ('site_admin', 'site_owner'));
$$;

create or replace function is_site_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p join users u on u.id = p.id where p.id = auth.uid() and (p.site_role = 'site_owner' or lower(p.username) = 'domonic' or lower(u.email) = 'matadomonic@gmail.com'));
$$;

alter table admin_notes enable row level security;
alter table moderation_log enable row level security;
create policy admin_notes_site_admin_all on admin_notes for all using (is_site_admin()) with check (is_site_admin());
create policy moderation_log_site_admin_all on moderation_log for all using (is_site_admin()) with check (is_site_admin());

create policy reports_admin_read on reports for select using (is_site_admin());
create policy reports_admin_update on reports for update using (is_site_admin()) with check (is_site_admin());
create policy suggest_edits_admin_read on suggest_edits for select using (is_site_admin());
create policy suggest_edits_admin_update on suggest_edits for update using (is_site_admin()) with check (is_site_admin());
create policy profiles_site_admin_update on profiles for update using (is_site_admin()) with check (is_site_admin());

grant select, insert, update on admin_notes, moderation_log to authenticated;
