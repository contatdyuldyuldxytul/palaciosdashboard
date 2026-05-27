
-- ============================================================
-- N8N Integration tables
-- ============================================================

-- Cache local dos workflows do n8n (sincronizado via n8n-proxy)
CREATE TABLE public.n8n_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  n8n_workflow_id text NOT NULL UNIQUE,
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT false,
  webhook_url text,
  tags text[] DEFAULT '{}',
  descricao text,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.n8n_workflows TO authenticated;
GRANT ALL ON public.n8n_workflows TO service_role;
ALTER TABLE public.n8n_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "n8n_workflows_view" ON public.n8n_workflows FOR SELECT TO authenticated USING (true);
CREATE POLICY "n8n_workflows_manage" ON public.n8n_workflows FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'fundador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'fundador'::app_role));

-- Bindings: "quando o evento X acontece, dispara o workflow Y"
CREATE TABLE public.n8n_event_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,             -- 'crm_stage_enter' | 'crm_deal_won' | 'crm_deal_lost' | 'activity_completed' | 'project_stage_enter'
  event_filter jsonb NOT NULL DEFAULT '{}'::jsonb, -- ex: { "stage_id": "..." } ou { "pipeline_id": "..." }
  workflow_id uuid NOT NULL REFERENCES public.n8n_workflows(id) ON DELETE CASCADE,
  webhook_url text NOT NULL,            -- URL completa do webhook do n8n
  ativo boolean NOT NULL DEFAULT true,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.n8n_event_bindings TO authenticated;
GRANT ALL ON public.n8n_event_bindings TO service_role;
ALTER TABLE public.n8n_event_bindings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "n8n_bindings_view" ON public.n8n_event_bindings FOR SELECT TO authenticated USING (true);
CREATE POLICY "n8n_bindings_manage" ON public.n8n_event_bindings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'fundador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'fundador'::app_role));

CREATE INDEX idx_n8n_bindings_event ON public.n8n_event_bindings (event_type, ativo);

-- Cache de execuções (espelha o n8n)
CREATE TABLE public.n8n_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  n8n_execution_id text UNIQUE,
  workflow_id uuid REFERENCES public.n8n_workflows(id) ON DELETE SET NULL,
  n8n_workflow_id text,
  event_type text,
  event_payload jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',  -- pending | success | error | running
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  crm_deal_id uuid,
  related_activity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.n8n_executions TO authenticated;
GRANT ALL ON public.n8n_executions TO service_role;
ALTER TABLE public.n8n_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "n8n_exec_view" ON public.n8n_executions FOR SELECT TO authenticated USING (true);
CREATE POLICY "n8n_exec_manage" ON public.n8n_executions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_n8n_exec_started ON public.n8n_executions (started_at DESC);
CREATE INDEX idx_n8n_exec_workflow ON public.n8n_executions (workflow_id, started_at DESC);

-- ============================================================
-- Trigger: quando deal muda de etapa, dispara n8n-dispatch via pg_net
-- ============================================================
CREATE OR REPLACE FUNCTION public.crm_deal_dispatch_n8n()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _supabase_url text;
  _service_key text;
  _event text;
BEGIN
  -- Determina evento
  IF TG_OP = 'INSERT' THEN
    _event := 'crm_deal_created';
  ELSIF NEW.status = 'won' AND OLD.status IS DISTINCT FROM 'won' THEN
    _event := 'crm_deal_won';
  ELSIF NEW.status = 'lost' AND OLD.status IS DISTINCT FROM 'lost' THEN
    _event := 'crm_deal_lost';
  ELSIF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
    _event := 'crm_stage_enter';
  ELSE
    RETURN NEW;
  END IF;

  -- Só dispara se existir binding ativo pro evento
  IF NOT EXISTS (
    SELECT 1 FROM public.n8n_event_bindings
    WHERE ativo = true AND event_type = _event
  ) THEN
    RETURN NEW;
  END IF;

  SELECT current_setting('app.supabase_url', true) INTO _supabase_url;
  IF _supabase_url IS NULL OR _supabase_url = '' THEN
    _supabase_url := 'https://zluhkwrcoupmqdhnjjew.supabase.co';
  END IF;

  PERFORM net.http_post(
    url := _supabase_url || '/functions/v1/n8n-dispatch',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'event_type', _event,
      'deal_id', NEW.id,
      'stage_id', NEW.stage_id,
      'pipeline_id', NEW.pipeline_id,
      'status', NEW.status
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_deals_dispatch_n8n_trigger ON public.crm_deals;
CREATE TRIGGER crm_deals_dispatch_n8n_trigger
  AFTER INSERT OR UPDATE ON public.crm_deals
  FOR EACH ROW EXECUTE FUNCTION public.crm_deal_dispatch_n8n();

-- Trigger pra updated_at
CREATE TRIGGER n8n_workflows_updated_at BEFORE UPDATE ON public.n8n_workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER n8n_bindings_updated_at BEFORE UPDATE ON public.n8n_event_bindings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
