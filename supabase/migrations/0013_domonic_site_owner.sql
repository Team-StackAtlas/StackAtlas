-- PR 9.1: keep Domonic's real auth-backed profile as the stored site owner.

update profiles p
set username = 'domonic',
    site_role = 'site_owner'
from users u
where u.id = p.id
  and lower(u.email) = 'matadomonic@gmail.com'
  and not exists (
    select 1
    from profiles existing
    where lower(existing.username) = 'domonic'
      and existing.id <> p.id
  );

update profiles p
set site_role = 'site_owner'
from users u
where u.id = p.id
  and (lower(u.email) = 'matadomonic@gmail.com' or lower(p.username) = 'domonic');

create or replace function is_site_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p where p.id = auth.uid() and p.site_role in ('site_admin', 'site_owner'));
$$;
