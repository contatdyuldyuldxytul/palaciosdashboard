-- Lock down SECURITY DEFINER functions: revoke public EXECUTE and grant only what's needed.
-- Trigger functions don't need EXECUTE grants — triggers run as table owner.
-- Only has_role and get_my_colaborador_slug are called from RLS policies / client.

REVOKE EXECUTE ON FUNCTION public.insert_strategic_input(text, uuid, text, integer, text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.import_monthly_strategy(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_deals_stage_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_deals_stage_change_enroll_sequence() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.daily_activity_n8n_callback() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.daily_activity_resume_flow() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.project_deals_stage_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_deal_enroll_flows() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_deal_dispatch_n8n() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_deal_won_to_project() FROM PUBLIC, anon, authenticated;

-- has_role is used inside RLS policies — authenticated needs EXECUTE
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- get_my_colaborador_slug is used inside RLS policies — authenticated needs EXECUTE
REVOKE EXECUTE ON FUNCTION public.get_my_colaborador_slug() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_colaborador_slug() TO authenticated;
