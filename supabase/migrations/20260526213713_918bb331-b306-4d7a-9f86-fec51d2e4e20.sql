
-- 1) integration_settings
CREATE TABLE public.integration_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.integration_settings TO authenticated;
GRANT ALL ON public.integration_settings TO service_role;
ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "is_view" ON public.integration_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "is_manage" ON public.integration_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'fundador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'fundador'::app_role));

-- 2) flow_runs novas colunas
ALTER TABLE public.flow_runs
  ADD COLUMN IF NOT EXISTS crm_deal_id uuid,
  ADD COLUMN IF NOT EXISTS waiting_activity_id uuid;
CREATE INDEX IF NOT EXISTS idx_flow_runs_status_resume ON public.flow_runs(status, resume_at);
CREATE INDEX IF NOT EXISTS idx_flow_runs_crm_deal ON public.flow_runs(crm_deal_id);

-- 3) enum activity_source: adicionar 'flow'
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='activity_source' AND e.enumlabel='flow') THEN
    ALTER TYPE activity_source ADD VALUE 'flow';
  END IF;
END $$;

-- 4) daily_activities novas colunas
ALTER TABLE public.daily_activities
  ADD COLUMN IF NOT EXISTS flow_run_id uuid,
  ADD COLUMN IF NOT EXISTS flow_node_id text;
CREATE INDEX IF NOT EXISTS idx_da_flow_run ON public.daily_activities(flow_run_id);

-- 5) Função: enroll deal em fluxo quando muda de etapa
CREATE OR REPLACE FUNCTION public.crm_deal_enroll_flows()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _flow RECORD;
  _trigger_node_id text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.stage_id IS NOT DISTINCT FROM OLD.stage_id THEN
    RETURN NEW;
  END IF;

  FOR _flow IN
    SELECT id, nodes, trigger_config
    FROM public.flows
    WHERE ativo = true
      AND scope = 'deals'
      AND (trigger_config->>'type') = 'crm_stage_enter'
      AND (trigger_config->>'stage_id')::uuid = NEW.stage_id
  LOOP
    SELECT (n->>'id') INTO _trigger_node_id
    FROM jsonb_array_elements(_flow.nodes) AS n
    WHERE (n->'data'->>'kind') = 'trigger'
    LIMIT 1;

    INSERT INTO public.flow_runs (flow_id, crm_deal_id, status, resume_at, current_node_id, context)
    VALUES (_flow.id, NEW.id, 'pending', now(), _trigger_node_id,
            jsonb_build_object('deal_id', NEW.id, 'stage_id', NEW.stage_id));
  END LOOP;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_crm_deal_enroll_flows ON public.crm_deals;
CREATE TRIGGER trg_crm_deal_enroll_flows
AFTER INSERT OR UPDATE OF stage_id ON public.crm_deals
FOR EACH ROW EXECUTE FUNCTION public.crm_deal_enroll_flows();

-- 6) Função: religar flow_run quando tarefa humana é concluída
CREATE OR REPLACE FUNCTION public.daily_activity_resume_flow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _run RECORD;
BEGIN
  IF NEW.completed = true AND (OLD.completed IS DISTINCT FROM NEW.completed)
     AND NEW.flow_run_id IS NOT NULL THEN

    SELECT id, flow_id, crm_deal_id INTO _run FROM public.flow_runs WHERE id = NEW.flow_run_id;
    IF FOUND AND _run.crm_deal_id IS NOT NULL AND NEW.flow_node_id IS NOT NULL THEN
      INSERT INTO public.flow_task_completions (deal_id, flow_id, node_id, completed_by)
      VALUES (_run.crm_deal_id, _run.flow_id, NEW.flow_node_id, auth.uid())
      ON CONFLICT (deal_id, flow_id, node_id) DO NOTHING;
    END IF;

    UPDATE public.flow_runs
      SET status = 'pending', resume_at = now(), waiting_activity_id = NULL
      WHERE id = NEW.flow_run_id AND status = 'waiting_human';
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_daily_activity_resume_flow ON public.daily_activities;
CREATE TRIGGER trg_daily_activity_resume_flow
AFTER UPDATE OF completed ON public.daily_activities
FOR EACH ROW EXECUTE FUNCTION public.daily_activity_resume_flow();
