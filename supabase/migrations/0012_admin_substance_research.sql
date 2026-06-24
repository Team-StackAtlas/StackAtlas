-- PR 9: Admin-only substance research foundation.

create table if not exists research_runs (
  id uuid primary key default gen_random_uuid(),
  substance_id uuid not null references substances(id) on delete restrict,
  title text not null,
  status text not null default 'draft' check (status in ('draft','collecting_sources','extracting_notes','needs_review','completed','failed')),
  notes text,
  error_log text,
  created_by uuid references users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists research_sources (
  id uuid primary key default gen_random_uuid(),
  research_run_id uuid references research_runs(id) on delete set null,
  substance_id uuid not null references substances(id) on delete restrict,
  title text not null,
  authors text,
  year integer,
  journal_or_site text,
  url text,
  doi text,
  pmid text,
  source_type text not null check (source_type in ('human_study','review_or_meta_analysis','animal_study','in_vitro_or_mechanistic','official_label_or_document','brand_or_vendor_document','coa_or_testing_document','practitioner_source','community_or_influencer_mention','other')),
  source_tier text not null default 'unknown' check (source_tier in ('formal_scientific','official_document','medical_explainer','practitioner_context','community_context','unknown')),
  abstract text,
  raw_metadata jsonb not null default '{}'::jsonb,
  match_status text not null check (match_status in ('strong_match','possible_match','weak_match','abbreviation_conflict','rejected_match')),
  review_status text not null default 'unreviewed' check (review_status in ('unreviewed','needs_review','approved','rejected','archived')),
  is_demo boolean not null default false,
  created_by uuid references users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists research_extracted_notes (
  id uuid primary key default gen_random_uuid(),
  research_run_id uuid references research_runs(id) on delete set null,
  research_source_id uuid not null references research_sources(id) on delete cascade,
  substance_id uuid not null references substances(id) on delete restrict,
  intervention text,
  endpoint text not null,
  direction text not null check (direction in ('increased','decreased','no_clear_change','mixed','not_extractable')),
  population text,
  dose_amount numeric,
  dose_unit text,
  route text,
  frequency text,
  duration text,
  study_type text not null check (study_type in ('human_rct','human_observational','review','meta_analysis','animal','in_vitro','mechanistic','official_document','other')),
  short_result_summary text,
  adverse_event_note text,
  extraction_notes text,
  extraction_flags text[] not null default '{}'::text[],
  review_status text not null default 'pending_review' check (review_status in ('pending_review','approved','approved_with_edits','rejected','irrelevant','needs_review','archived')),
  reviewed_by uuid references users(id) on delete set null,
  reviewed_at timestamptz,
  created_by uuid references users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint research_extracted_notes_flags_check check (extraction_flags <@ array['animal_only','in_vitro_only','no_dose_found','weak_entity_match','abbreviation_conflict','review_not_original_trial','endpoint_too_broad','unclear_population','possible_duplicate','possible_safety_note','conflicting_result','needs_manual_check']::text[])
);

alter table research_runs enable row level security;
alter table research_sources enable row level security;
alter table research_extracted_notes enable row level security;

create policy research_runs_site_admin_all on research_runs for all using (is_site_admin()) with check (is_site_admin());
create policy research_sources_site_admin_all on research_sources for all using (is_site_admin()) with check (is_site_admin());
create policy research_extracted_notes_site_admin_all on research_extracted_notes for all using (is_site_admin()) with check (is_site_admin());

grant select, insert, update on research_runs, research_sources, research_extracted_notes to authenticated;

insert into research_runs (substance_id,title,status,notes)
select s.id, s.name || ' demo research run', 'needs_review', 'Admin-only demo research run.'
from substances s where s.name in ('Creatine','Ashwagandha')
on conflict do nothing;

insert into research_sources (research_run_id, substance_id, title, authors, year, journal_or_site, url, doi, pmid, source_type, source_tier, abstract, match_status, review_status, is_demo)
select r.id, r.substance_id, v.title, v.authors, v.year, v.journal, v.url, v.doi, v.pmid, v.source_type, v.source_tier, v.abstract, 'strong_match', 'needs_review', true
from research_runs r join substances s on s.id = r.substance_id
cross join lateral (values
  (s.name || ' human study demo source', 'StackAtlas Demo', 2024, 'Demo Journal', 'https://example.com/' || s.slug || '/study', '10.0000/demo-' || s.slug || '-1', null, 'human_study', 'formal_scientific', 'Demo abstract for admin review only.'),
  (s.name || ' review demo source', 'StackAtlas Demo', 2023, 'Demo Review', 'https://example.com/' || s.slug || '/review', null, 'DEMO' || upper(replace(s.slug,'-','')), 'review_or_meta_analysis', 'formal_scientific', 'Demo review abstract for admin review only.')
) as v(title,authors,year,journal,url,doi,pmid,source_type,source_tier,abstract)
where s.name in ('Creatine','Ashwagandha')
on conflict do nothing;

insert into research_extracted_notes (research_run_id,research_source_id,substance_id,intervention,endpoint,direction,population,dose_amount,dose_unit,route,frequency,duration,study_type,short_result_summary,extraction_notes,extraction_flags,review_status)
select src.research_run_id, src.id, src.substance_id, s.name, case when rn = 1 then 'Performance' else 'Stress marker' end, case when rn = 1 then 'increased' else 'mixed' end, 'Adults', case when rn = 1 then 5 else null end, case when rn = 1 then 'g' else null end, 'oral', 'daily', '8 weeks', case when rn = 1 then 'human_rct' else 'review' end, 'Demo extracted note for admin review.', 'Admin-only demo extraction.', array['needs_manual_check']::text[], case when rn = 1 then 'pending_review' else 'needs_review' end
from (select rs.*, row_number() over (partition by rs.research_run_id order by rs.title) rn from research_sources rs where rs.is_demo) src
join substances s on s.id = src.substance_id
where s.name in ('Creatine','Ashwagandha')
on conflict do nothing;
