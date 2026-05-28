
-- 1. Restrict integration_settings SELECT to fundador
DROP POLICY IF EXISTS "is_view" ON public.integration_settings;
CREATE POLICY "is_view" ON public.integration_settings
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'fundador'::app_role));

-- 2. Restrict n8n_workflows SELECT to fundador
DROP POLICY IF EXISTS "n8n_workflows_view" ON public.n8n_workflows;
CREATE POLICY "n8n_workflows_view" ON public.n8n_workflows
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'fundador'::app_role));

-- 3. Restrict n8n_event_bindings SELECT to fundador
DROP POLICY IF EXISTS "n8n_bindings_view" ON public.n8n_event_bindings;
CREATE POLICY "n8n_bindings_view" ON public.n8n_event_bindings
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'fundador'::app_role));

-- 4. Fix search_path on update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- 5. Revoke EXECUTE from anon/authenticated on api-key-guarded SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.import_monthly_strategy(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.insert_strategic_input(text, uuid, text, integer, text, bigint) FROM PUBLIC, anon, authenticated;
