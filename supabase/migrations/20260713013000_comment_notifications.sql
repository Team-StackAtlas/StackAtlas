-- Notifications for comments and replies, generated in the database so no
-- client path can skip them. Post likes already notify via the service
-- layer; this covers the other half of the community loop.

create or replace function notify_on_post_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_post_author uuid; v_parent_author uuid; v_actor_name text;
begin
  select author_id into v_post_author from posts where id = new.post_id;
  select username into v_actor_name from profiles where id = new.author_id;

  if new.parent_id is not null then
    select author_id into v_parent_author from post_comments where id = new.parent_id;
    if v_parent_author is not null and v_parent_author <> new.author_id then
      insert into notifications (user_id, recipient_id, actor_id, kind, category, title, link, target_type, target_id, metadata)
      values (v_parent_author, v_parent_author, new.author_id, 'comment_reply', 'replies',
              format('@%s replied to your comment', coalesce(v_actor_name, 'someone')),
              '/post/' || new.post_id, 'post', new.post_id::text, '{}'::jsonb);
    end if;
  end if;

  -- Notify the post author unless they wrote the comment or were already
  -- notified as the parent-comment author.
  if v_post_author is not null and v_post_author <> new.author_id
     and (v_parent_author is null or v_parent_author <> v_post_author) then
    insert into notifications (user_id, recipient_id, actor_id, kind, category, title, link, target_type, target_id, metadata)
    values (v_post_author, v_post_author, new.author_id, 'post_comment', 'replies',
            format('@%s commented on your post', coalesce(v_actor_name, 'someone')),
            '/post/' || new.post_id, 'post', new.post_id::text, '{}'::jsonb);
  end if;

  return new;
end $$;

drop trigger if exists notify_on_post_comment on post_comments;
create trigger notify_on_post_comment
  after insert on post_comments
  for each row execute function notify_on_post_comment();

notify pgrst, 'reload schema';
