-- PR 4: follows, private accounts, requests, and public counts.

alter type follow_target add value if not exists 'album';

create table if not exists follow_requests (
  requester_id uuid not null references users (id) on delete cascade,
  target_user_id uuid not null references users (id) on delete cascade,
  status text not null default 'pending' check (status = 'pending'),
  created_at timestamptz not null default now(),
  primary key (requester_id, target_user_id),
  check (requester_id <> target_user_id)
);

alter table follow_requests enable row level security;

drop policy if exists follow_requests_requester_insert on follow_requests;
create policy follow_requests_requester_insert on follow_requests for insert
  with check (auth.uid() = requester_id);

drop policy if exists follow_requests_private_read on follow_requests;
create policy follow_requests_private_read on follow_requests for select
  using (auth.uid() = requester_id or auth.uid() = target_user_id);

drop policy if exists follow_requests_private_delete on follow_requests;
create policy follow_requests_private_delete on follow_requests for delete
  using (auth.uid() = requester_id or auth.uid() = target_user_id);

create or replace function approve_follow_request(p_target_user_id uuid, p_requester_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() <> p_target_user_id then
    raise exception 'not_allowed';
  end if;
  insert into follows (follower_id, target_type, target_id)
  values (p_requester_id, 'user', p_target_user_id::text)
  on conflict do nothing;
  delete from follow_requests
  where requester_id = p_requester_id and target_user_id = p_target_user_id;
end;
$$;

create or replace view follower_counts as
select target_type, target_id, count(*)::bigint as followers_count
from follows
group by target_type, target_id;

drop policy if exists follows_read_own_or_counts on follows;
-- Keep relationship lists private. Public follower counts are exposed via follower_counts only.

-- Preserve private relationship lists: users can only read/write their own follows.
drop policy if exists follows_owner on follows;
create policy follows_owner on follows for all
  using (auth.uid() = follower_id)
  with check (auth.uid() = follower_id);

grant select on follower_counts to anon, authenticated;
grant select, insert, delete on follow_requests to authenticated;
grant execute on function approve_follow_request(uuid, uuid) to authenticated;

-- Include account privacy in normalized profile settings; default remains public.
create or replace function normalize_profile_settings() returns trigger
language plpgsql as $$
begin
  new.settings := jsonb_build_object(
    'savedPrivate', true,
    'showActivity', coalesce((new.settings->>'showActivity')::boolean, false),
    'showAvatar', coalesce((new.settings->>'showAvatar')::boolean, false),
    'showAge', coalesce((new.settings->>'showAge')::boolean, false),
    'showWeight', coalesce((new.settings->>'showWeight')::boolean, false),
    'showHeight', coalesce((new.settings->>'showHeight')::boolean, false),
    'showSex', coalesce((new.settings->>'showSex')::boolean, false),
    'showBodyFat', coalesce((new.settings->>'showBodyFat')::boolean, false),
    'accountPrivacy', case when new.settings->>'accountPrivacy' = 'private' then 'private' else 'public' end,
    'showFollowers', false,
    'showFollowing', false,
    'showBodyStats', coalesce((new.settings->>'showBodyStats')::boolean, false)
  );
  return new;
end;
$$;
