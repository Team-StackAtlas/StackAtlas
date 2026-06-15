-- PR 7: reports, suggest edits, and moderation queue shell.

alter table reports alter column target_type type text using target_type::text;
alter table reports alter column status type text using case status::text when 'open' then 'pending' when 'reviewing' then 'reviewed' when 'resolved' then 'reviewed' when 'dismissed' then 'rejected' else status::text end;
alter table reports rename column reporter_id to reporter_user_id;
alter table reports rename column category to reason;
alter table reports rename column details to note;
alter table reports add column if not exists updated_at timestamptz not null default now();
alter table reports alter column status set default 'pending';
alter table reports add constraint reports_target_type_check check (target_type in ('post', 'comment', 'reply', 'profile', 'album'));
alter table reports add constraint reports_reason_check check (reason in ('Spam', 'Abuse / Harassment', 'Dangerous Advice', 'False or Misleading Information', 'Off-topic', 'Duplicate', 'Privacy / Personal Info', 'Illegal or Prohibited Content', 'Other'));
alter table reports add constraint reports_status_check check (status in ('pending', 'reviewed', 'rejected', 'action_staged'));
create unique index if not exists reports_one_per_user_target on reports (reporter_user_id, target_type, target_id);

alter table suggest_edits alter column target_type type text using target_type::text;
alter table suggest_edits alter column status type text using case status::text when 'approved' then 'reviewed' else status::text end;
alter table suggest_edits rename column user_id to submitter_user_id;
alter table suggest_edits rename column details to suggestion_text;
alter table suggest_edits add column if not exists target_field text;
alter table suggest_edits add column if not exists updated_at timestamptz not null default now();
alter table suggest_edits add constraint suggest_edits_target_type_check check (target_type in ('substance', 'brand', 'stack'));
alter table suggest_edits add constraint suggest_edits_status_check check (status in ('pending', 'reviewed', 'rejected', 'action_staged'));
alter table suggest_edits alter column status set default 'pending';

create or replace function set_moderation_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reports_set_updated_at on reports;
create trigger reports_set_updated_at before update on reports for each row execute function set_moderation_updated_at();

drop trigger if exists suggest_edits_set_updated_at on suggest_edits;
create trigger suggest_edits_set_updated_at before update on suggest_edits for each row execute function set_moderation_updated_at();

drop policy if exists reports_authenticated_insert on reports;
drop policy if exists reports_owner_read on reports;
drop policy if exists reports_owner_update on reports;
create policy reports_owner_read on reports for select using (reporter_user_id = auth.uid());
create policy reports_owner_insert on reports for insert with check (auth.uid() is not null and reporter_user_id = auth.uid());
create policy reports_owner_update on reports for update using (reporter_user_id = auth.uid()) with check (reporter_user_id = auth.uid());

drop policy if exists suggest_edits_authenticated_insert on suggest_edits;
drop policy if exists suggest_edits_owner_read on suggest_edits;
drop policy if exists suggest_edits_owner_insert on suggest_edits;
create policy suggest_edits_owner_read on suggest_edits for select using (submitter_user_id = auth.uid());
create policy suggest_edits_owner_insert on suggest_edits for insert with check (auth.uid() is not null and submitter_user_id = auth.uid());

grant select, insert, update on reports to authenticated;
grant select, insert on suggest_edits to authenticated;
