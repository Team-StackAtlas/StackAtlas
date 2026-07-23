-- DM message reactions: make them actually usable.
--
-- 0009 created message_reactions with a single FOR ALL policy scoped to
-- user_id = auth.uid(), which doubles as the SELECT policy — so nobody could
-- ever SEE anyone else's reactions. And the comms grant line omitted DELETE,
-- so a reaction could never be removed. The UI consequently never wired
-- reactions for persisted messages (they were mock-only until now).
--
-- Adds a participant-scoped read policy (visible to anyone in the message's
-- conversation) and the missing delete grant. The client degrades gracefully
-- before this is applied: reads return only the viewer's own rows and
-- un-reacting fails quietly into a refresh.

create policy message_reactions_participant_read on message_reactions
  for select using (
    exists (
      select 1
      from messages m
      join conversation_participants cp on cp.conversation_id = m.conversation_id
      where m.id = message_reactions.message_id
        and cp.user_id = auth.uid()
    )
  );

grant delete on message_reactions to authenticated;

notify pgrst, 'reload schema';
