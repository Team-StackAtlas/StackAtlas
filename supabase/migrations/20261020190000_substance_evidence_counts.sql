-- Public, read-only count of research sources linked to each substance, so
-- catalog cards can show a real number instead of a made-up one. Research
-- tables are admin-only under RLS; this view exposes only the count.
-- Rejected and archived sources are excluded; everything else counts as a
-- linked source (review is a separate, slower process).
create or replace view substance_evidence_counts
with (security_invoker = false) as
select rss.substance_id, count(distinct rs.id)::int as source_count
from research_source_substances rss
join research_sources rs on rs.id = rss.source_id
where coalesce(rs.review_status, 'unreviewed') not in ('rejected', 'archived')
group by rss.substance_id;

grant select on substance_evidence_counts to anon, authenticated;
