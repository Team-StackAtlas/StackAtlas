-- PR 6: Comms data model for DMs, requests, media, read states, typing, and Quarters.

create type comms_conversation_status as enum ('accepted', 'requested', 'declined');
create type comms_message_kind as enum ('text', 'image', 'voice', 'file');
create type quarter_member_role as enum ('owner', 'admin', 'member');
create type quarter_invite_status as enum ('pending', 'accepted', 'declined');

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references users (id) on delete set null,
  status comms_conversation_status not null default 'accepted',
  requested_by uuid references users (id) on delete set null,
  declined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists conversation_participants (
  conversation_id uuid references conversations (id) on delete cascade,
  user_id uuid references users (id) on delete cascade,
  last_read_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create unique index if not exists one_open_request_per_sender_recipient on conversations (requested_by, id) where status = 'requested';

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations (id) on delete cascade,
  sender_id uuid not null references users (id) on delete cascade,
  kind comms_message_kind not null default 'text',
  body text not null default '',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint messages_have_dm_scope check (conversation_id is not null)
);

create table if not exists message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages (id) on delete cascade,
  bucket text not null default 'comms-media',
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size integer not null check (file_size > 0 and file_size <= 10485760),
  duration_seconds integer,
  created_at timestamptz not null default now(),
  constraint safe_comms_attachment_type check (mime_type in ('image/png', 'image/jpeg', 'image/webp', 'audio/webm', 'audio/mpeg', 'application/pdf', 'text/plain'))
);

create table if not exists message_read_states (
  message_id uuid references messages (id) on delete cascade,
  user_id uuid references users (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table if not exists message_reactions (
  message_id uuid references messages (id) on delete cascade,
  user_id uuid references users (id) on delete cascade,
  emoji text not null check (char_length(emoji) <= 8),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create table if not exists quarters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists quarter_members (
  quarter_id uuid references quarters (id) on delete cascade,
  user_id uuid references users (id) on delete cascade,
  role quarter_member_role not null default 'member',
  last_read_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (quarter_id, user_id)
);

create table if not exists quarter_invites (
  id uuid primary key default gen_random_uuid(),
  quarter_id uuid not null references quarters (id) on delete cascade,
  inviter_id uuid not null references users (id) on delete cascade,
  invitee_id uuid not null references users (id) on delete cascade,
  status quarter_invite_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (quarter_id, invitee_id)
);

create table if not exists quarter_messages (
  id uuid primary key default gen_random_uuid(),
  quarter_id uuid not null references quarters (id) on delete cascade,
  sender_id uuid not null references users (id) on delete cascade,
  kind comms_message_kind not null default 'text',
  body text not null default '',
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists comms_typing_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  conversation_id uuid references conversations (id) on delete cascade,
  quarter_id uuid references quarters (id) on delete cascade,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint one_typing_scope check ((conversation_id is not null) <> (quarter_id is not null))
);

alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;
alter table message_attachments enable row level security;
alter table message_read_states enable row level security;
alter table message_reactions enable row level security;
alter table quarters enable row level security;
alter table quarter_members enable row level security;
alter table quarter_invites enable row level security;
alter table quarter_messages enable row level security;
alter table comms_typing_states enable row level security;

create policy conversations_member_read on conversations for select using (exists (select 1 from conversation_participants cp where cp.conversation_id = id and cp.user_id = auth.uid()));
create policy conversation_participants_member_read on conversation_participants for select using (user_id = auth.uid() or exists (select 1 from conversation_participants cp where cp.conversation_id = conversation_participants.conversation_id and cp.user_id = auth.uid()));
create policy messages_member_read on messages for select using (exists (select 1 from conversation_participants cp where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()));
create policy messages_member_insert on messages for insert with check (sender_id = auth.uid() and exists (select 1 from conversation_participants cp join conversations c on c.id = cp.conversation_id where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid() and c.status = 'accepted'));
create policy message_attachments_member_read on message_attachments for select using (exists (select 1 from messages m join conversation_participants cp on cp.conversation_id = m.conversation_id where m.id = message_attachments.message_id and cp.user_id = auth.uid()));
create policy message_read_states_owner on message_read_states for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy message_reactions_member on message_reactions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy quarters_member_read on quarters for select using (exists (select 1 from quarter_members qm where qm.quarter_id = id and qm.user_id = auth.uid() and qm.removed_at is null));
create policy quarters_owner_insert on quarters for insert with check (owner_id = auth.uid());
create policy quarters_owner_update on quarters for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy quarter_members_member_read on quarter_members for select using (user_id = auth.uid() or exists (select 1 from quarter_members qm where qm.quarter_id = quarter_members.quarter_id and qm.user_id = auth.uid() and qm.removed_at is null));
create policy quarter_invites_visible on quarter_invites for select using (invitee_id = auth.uid() or inviter_id = auth.uid());
create policy quarter_messages_member_read on quarter_messages for select using (exists (select 1 from quarter_members qm where qm.quarter_id = quarter_messages.quarter_id and qm.user_id = auth.uid() and qm.removed_at is null));
create policy quarter_messages_member_insert on quarter_messages for insert with check (sender_id = auth.uid() and exists (select 1 from quarter_members qm where qm.quarter_id = quarter_messages.quarter_id and qm.user_id = auth.uid() and qm.removed_at is null));
create policy comms_typing_owner on comms_typing_states for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update on conversations, conversation_participants, messages, message_attachments, message_read_states, message_reactions, quarters, quarter_members, quarter_invites, quarter_messages, comms_typing_states to authenticated;
