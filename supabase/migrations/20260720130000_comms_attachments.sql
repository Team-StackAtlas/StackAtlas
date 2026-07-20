-- Image and file attachments for persisted Comms messages (DMs and
-- Quarters). Voice capture stays out of scope (message_attachments already
-- has a duration_seconds column reserved for it; unused here).
--
-- Builds on the 0009 comms data model: message_attachments already exists
-- (id, message_id, bucket, storage_path, file_name, mime_type, file_size,
-- duration_seconds, created_at) with RLS enabled, a
-- message_attachments_member_read select policy, and select/insert/update
-- grants to authenticated -- but no insert policy, so inserts are currently
-- denied. This migration adds that insert policy, mirrors the table for
-- Quarters (quarter_message_attachments, which does not exist yet), and
-- creates the private storage bucket + object policies both tables' rows
-- point into.
--
-- message_attachments' existing safe_comms_attachment_type check constraint
-- allows image/png, image/jpeg, image/webp, audio/webm, audio/mpeg,
-- application/pdf, text/plain -- but not image/gif. The comms-media bucket
-- below is scoped to allow image/gif (a common, harmless image type worth
-- supporting from day one). Widening the existing check constraint to match
-- keeps the bucket's allow-list and the table's allow-list from silently
-- disagreeing (which would otherwise let a gif upload succeed in storage
-- and then fail on the attachment row insert). The constraint is extended,
-- not narrowed: existing allowed types (including the audio ones reserved
-- for future voice) are kept.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'comms-media',
  'comms-media',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'text/plain']
)
on conflict (id) do nothing;

alter table message_attachments drop constraint if exists safe_comms_attachment_type;
alter table message_attachments add constraint safe_comms_attachment_type check (
  mime_type in (
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'audio/webm', 'audio/mpeg',
    'application/pdf', 'text/plain'
  )
);

create table if not exists quarter_message_attachments (
  id uuid primary key default gen_random_uuid(),
  quarter_message_id uuid not null references quarter_messages (id) on delete cascade,
  bucket text not null default 'comms-media',
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size integer not null check (file_size > 0 and file_size <= 10485760),
  duration_seconds integer,
  created_at timestamptz not null default now(),
  constraint safe_quarter_comms_attachment_type check (
    mime_type in (
      'image/png', 'image/jpeg', 'image/webp', 'image/gif',
      'audio/webm', 'audio/mpeg',
      'application/pdf', 'text/plain'
    )
  )
);

alter table quarter_message_attachments enable row level security;

-- Read: member of the quarter the parent quarter_message belongs to.
-- Subquerying quarter_messages (not quarter_message_attachments itself) is
-- not a self-reference, so this doesn't hit the 42P17 recursion bug fixed
-- in 20260713203000 -- it still goes through the is_quarter_member() helper
-- per that migration's standing rule of never subquerying membership tables
-- directly.
create policy quarter_message_attachments_member_read on quarter_message_attachments
  for select using (
    is_quarter_member((
      select qm.quarter_id from quarter_messages qm where qm.id = quarter_message_attachments.quarter_message_id
    ))
  );

-- Insert: caller must be the sender of the parent quarter message and a
-- current member of that quarter.
create policy quarter_message_attachments_sender_insert on quarter_message_attachments
  for insert with check (
    exists (
      select 1 from quarter_messages qm
      where qm.id = quarter_message_id
        and qm.sender_id = auth.uid()
        and is_quarter_member(qm.quarter_id)
    )
  );

grant select, insert on quarter_message_attachments to authenticated;

-- message_attachments has RLS + a read policy already (0009) but no insert
-- policy, so inserts are currently denied outright. Caller must be the
-- sender of the parent message and a participant in its conversation.
create policy message_attachments_sender_insert on message_attachments
  for insert with check (
    exists (select 1 from messages m where m.id = message_id and m.sender_id = auth.uid())
    and is_conversation_participant((select conversation_id from messages where id = message_id))
  );

-- Storage object policies for the comms-media bucket. Objects are keyed
-- dm/{conversation_id}/{uuid}.{ext} or quarter/{quarter_id}/{uuid}.{ext};
-- the regex guard ensures the uuid segment is well-formed before the
-- policy casts it to uuid, so a malformed path can't error the policy
-- (it just evaluates to false / not matched).
create policy comms_media_select on storage.objects
  for select using (
    bucket_id = 'comms-media'
    and name ~ '^(dm|quarter)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
    and case split_part(name, '/', 1)
      when 'dm' then is_conversation_participant((split_part(name, '/', 2))::uuid)
      when 'quarter' then is_quarter_member((split_part(name, '/', 2))::uuid)
      else false
    end
  );

create policy comms_media_insert on storage.objects
  for insert with check (
    bucket_id = 'comms-media'
    and name ~ '^(dm|quarter)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
    and case split_part(name, '/', 1)
      when 'dm' then is_conversation_participant((split_part(name, '/', 2))::uuid)
      when 'quarter' then is_quarter_member((split_part(name, '/', 2))::uuid)
      else false
    end
  );

create policy comms_media_owner_delete on storage.objects
  for delete using (
    bucket_id = 'comms-media' and owner = auth.uid()
  );

notify pgrst, 'reload schema';
