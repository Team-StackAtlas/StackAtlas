-- PR 47: source-first admin research intake.

alter table research_sources alter column substance_id drop not null;
alter table research_sources alter column match_status set default 'strong_match';
alter table research_sources alter column source_tier set default 'unknown';

create table if not exists research_source_substances (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references research_sources(id) on delete cascade,
  substance_id uuid not null references substances(id) on delete restrict,
  notes text,
  created_by uuid references users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (source_id, substance_id)
);

insert into research_source_substances (source_id, substance_id, created_by, created_at)
select id, substance_id, created_by, created_at
from research_sources
where substance_id is not null
on conflict do nothing;

create table if not exists research_import_batches (
  id uuid primary key default gen_random_uuid(),
  imported_by uuid references users(id) on delete set null default auth.uid(),
  row_count integer not null default 0,
  imported_count integer not null default 0,
  skipped_count integer not null default 0,
  error_count integer not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

alter table research_source_substances enable row level security;
alter table research_import_batches enable row level security;

drop policy if exists research_source_substances_site_admin_all on research_source_substances;
create policy research_source_substances_site_admin_all on research_source_substances
  for all using (is_site_admin()) with check (is_site_admin());

drop policy if exists research_import_batches_site_owner_all on research_import_batches;
create policy research_import_batches_site_owner_all on research_import_batches
  for all using (is_site_owner()) with check (is_site_owner());

grant select, insert, update on research_source_substances to authenticated;
grant select, insert, update on research_import_batches to authenticated;
