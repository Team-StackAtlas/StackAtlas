-- PR 10.1: make Admin Research substance selection usable on real catalog data.

-- Admin Research needs a small real-substance starting set. Match by normalized
-- lowercase name so re-running this migration does not create case variants.
insert into substances (slug, name, classification, description)
select v.slug, v.name, v.classification::classification, v.description
from (values
  ('creatine', 'Creatine', 'Everyday', 'Creatine research seed for Admin Research.'),
  ('ashwagandha', 'Ashwagandha', 'Everyday', 'Ashwagandha research seed for Admin Research.'),
  ('caffeine', 'Caffeine', 'Everyday', 'Caffeine research seed for Admin Research.'),
  ('magnesium', 'Magnesium', 'Everyday', 'Magnesium research seed for Admin Research.'),
  ('omega-3', 'Omega-3', 'Everyday', 'Omega-3 research seed for Admin Research.')
) as v(slug, name, classification, description)
where not exists (
  select 1
  from substances s
  where lower(s.name) = lower(v.name)
)
on conflict (slug) do nothing;

-- Prevent future case-variant substance names when the current database can
-- support the guard safely. If historical duplicates exist, leave data untouched
-- and report the conflict as a migration notice instead of destructively merging.
do $$
begin
  if exists (
    select 1
    from substances
    group by lower(name)
    having count(*) > 1
  ) then
    raise notice 'Skipped substances_lower_name_unique because existing case-insensitive duplicate substance names are present.';
  elsif not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'substances_lower_name_unique'
  ) then
    execute 'create unique index substances_lower_name_unique on substances (lower(name))';
  end if;
end $$;

-- Ensure stored-role admins can read the substance rows needed by Admin Research
-- if RLS is enabled on substances in an existing Supabase project.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'substances'
      and policyname = 'substances_site_admin_read'
  ) then
    execute 'create policy substances_site_admin_read on substances for select using (is_site_admin())';
  end if;
end $$;

grant select on substances to authenticated;
