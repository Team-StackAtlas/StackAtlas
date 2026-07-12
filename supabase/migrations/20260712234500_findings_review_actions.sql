-- Findings review actions: approve / reject / archive / reopen, audit-logged.
--
-- Completes the review step of the research spine
-- (Substance -> Sources -> Findings -> Review -> Public Knowledge).
-- Findings never publish automatically; approval only changes review_status.

create or replace function admin_review_finding(p_finding_id uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_prev text; v_endpoint text;
begin
  if auth.uid() is null or not is_site_admin() then
    raise exception 'site_admin or site_owner role is required';
  end if;
  if p_status not in ('approved', 'rejected', 'archived', 'pending_review') then
    raise exception 'invalid review status: %', coalesce(p_status, '(missing)');
  end if;

  select review_status, endpoint into v_prev, v_endpoint
  from research_findings where id = p_finding_id;
  if v_prev is null then
    raise exception 'unknown finding: %', p_finding_id;
  end if;

  update research_findings
  set review_status = p_status,
      reviewed_by = case when p_status = 'pending_review' then null else auth.uid() end,
      reviewed_at = case when p_status = 'pending_review' then null else now() end,
      updated_at = now()
  where id = p_finding_id;

  insert into moderation_log (admin_user_id, action_type, target_type, target_id, note)
  values (auth.uid(), 'research_finding_review', 'research_finding', p_finding_id,
          format('%s -> %s (%s)', v_prev, p_status, v_endpoint));

  return jsonb_build_object('id', p_finding_id, 'review_status', p_status, 'previous_status', v_prev);
end $$;

revoke all on function admin_review_finding(uuid, text) from public, anon, authenticated;
grant execute on function admin_review_finding(uuid, text) to authenticated;

notify pgrst, 'reload schema';
