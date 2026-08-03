-- Advisor cleanup: revoke anon EXECUTE on the three SECURITY DEFINER
-- functions the anon_security_definer_function_executable lint flags.
--
-- None of these are ever called without a session: approve_follow_request is
-- only invoked from the signed-in follow-requests flow
-- (src/services/supabase/index.ts approveRequest), and
-- is_site_admin/is_site_owner are never RPC'd by the client at all — they
-- exist for policies and other RPCs, which run them as the calling role
-- regardless of grants on the REST surface. Each also self-guards on
-- auth.uid(), so this closes advisor noise rather than a live hole.
revoke execute on function approve_follow_request(uuid, uuid) from anon;
revoke execute on function is_site_admin() from anon;
revoke execute on function is_site_owner() from anon;

notify pgrst, 'reload schema';
