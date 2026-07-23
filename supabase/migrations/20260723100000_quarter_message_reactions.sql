-- Quarter message reactions: same model as DM message_reactions (0009 + the
-- dm_reaction migration), scoped to quarter membership. Completes reaction
-- parity across Comms — DMs and Quarters now both persist reactions.
--
-- The client degrades gracefully before this is applied: reads fail into an
-- empty set and toggles fail into a silent refresh.

create table if not exists quarter_message_reactions (
  quarter_message_id uuid references quarter_messages (id) on delete cascade,
  user_id uuid references users (id) on delete cascade,
  emoji text not null check (char_length(emoji) <= 8),
  created_at timestamptz not null default now(),
  primary key (quarter_message_id, user_id, emoji)
);

create index if not exists quarter_message_reactions_user_id_idx
  on quarter_message_reactions (user_id);

alter table quarter_message_reactions enable row level security;

-- Members of the quarter can see all reactions in it; everyone manages only
-- their own rows.
create policy quarter_message_reactions_member_read on quarter_message_reactions
  for select using (
    exists (
      select 1
      from quarter_messages qm
      join quarter_members m on m.quarter_id = qm.quarter_id
      where qm.id = quarter_message_reactions.quarter_message_id
        and m.user_id = auth.uid()
        and m.removed_at is null
    )
  );
create policy quarter_message_reactions_own_write on quarter_message_reactions
  for insert with check (user_id = auth.uid());
create policy quarter_message_reactions_own_delete on quarter_message_reactions
  for delete using (user_id = auth.uid());

grant select, insert, delete on quarter_message_reactions to authenticated;

notify pgrst, 'reload schema';
