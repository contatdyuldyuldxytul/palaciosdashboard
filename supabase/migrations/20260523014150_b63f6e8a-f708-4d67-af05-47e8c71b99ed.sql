
-- ============ PROJECT PIPELINES ============
CREATE TABLE public.project_pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY pp_view ON public.project_pipelines FOR SELECT TO authenticated USING (true);
CREATE POLICY pp_manage ON public.project_pipelines FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'fundador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'fundador'::app_role));

-- ============ PROJECT STAGES ============
CREATE TABLE public.project_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL REFERENCES public.project_pipelines(id) ON DELETE CASCADE,
  nome text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  cor text DEFAULT '#3b82f6',
  is_final boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY ps_view ON public.project_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY ps_manage ON public.project_stages FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'fundador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'fundador'::app_role));

-- ============ PROJECT DEALS ============
CREATE TABLE public.project_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL REFERENCES public.project_pipelines(id) ON DELETE RESTRICT,
  stage_id uuid NOT NULL REFERENCES public.project_stages(id) ON DELETE RESTRICT,
  cliente_ativo_id uuid REFERENCES public.clientes_ativos(id) ON DELETE SET NULL,
  crm_deal_id uuid REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  valor numeric DEFAULT 0,
  progresso integer DEFAULT 0,
  responsavel_user_id uuid,
  responsavel_label text,
  status text NOT NULL DEFAULT 'open',
  stage_entered_at timestamptz NOT NULL DEFAULT now(),
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY pd_view ON public.project_deals FOR SELECT TO authenticated USING (true);
CREATE POLICY pd_insert ON public.project_deals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY pd_update ON public.project_deals FOR UPDATE TO authenticated USING (true);
CREATE POLICY pd_delete ON public.project_deals FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'fundador'::app_role));

CREATE INDEX idx_project_deals_pipeline ON public.project_deals(pipeline_id);
CREATE INDEX idx_project_deals_stage ON public.project_deals(stage_id);

-- Stage change trigger
CREATE OR REPLACE FUNCTION public.project_deals_stage_change()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
    NEW.stage_entered_at = now();
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_project_deals_stage_change
  BEFORE UPDATE ON public.project_deals
  FOR EACH ROW EXECUTE FUNCTION public.project_deals_stage_change();

-- Auto-create project when crm_deal becomes won
CREATE OR REPLACE FUNCTION public.crm_deal_won_to_project()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  _pipeline_id uuid;
  _stage_id uuid;
  _titulo text;
BEGIN
  IF NEW.status = 'won' AND (OLD.status IS NULL OR OLD.status <> 'won') THEN
    SELECT id INTO _pipeline_id FROM public.project_pipelines
      WHERE ativo = true AND is_default = true ORDER BY ordem LIMIT 1;
    IF _pipeline_id IS NULL THEN
      RETURN NEW;
    END IF;
    SELECT id INTO _stage_id FROM public.project_stages
      WHERE pipeline_id = _pipeline_id ORDER BY ordem LIMIT 1;
    IF _stage_id IS NULL THEN
      RETURN NEW;
    END IF;
    -- avoid duplicate
    IF EXISTS (SELECT 1 FROM public.project_deals WHERE crm_deal_id = NEW.id) THEN
      RETURN NEW;
    END IF;
    _titulo := COALESCE(NEW.titulo, 'Projeto');
    INSERT INTO public.project_deals (pipeline_id, stage_id, crm_deal_id, titulo, valor, responsavel_user_id, responsavel_label)
    VALUES (_pipeline_id, _stage_id, NEW.id, _titulo, NEW.valor, NEW.owner_user_id, NEW.owner_label);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_crm_deal_won_to_project
  AFTER UPDATE ON public.crm_deals
  FOR EACH ROW EXECUTE FUNCTION public.crm_deal_won_to_project();

-- ============ FLOWS ============
CREATE TABLE public.flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT false,
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  edges jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;
CREATE POLICY flows_view ON public.flows FOR SELECT TO authenticated USING (true);
CREATE POLICY flows_manage ON public.flows FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'fundador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'fundador'::app_role));

CREATE TABLE public.flow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  project_deal_id uuid REFERENCES public.project_deals(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  resume_at timestamptz,
  current_node_id text,
  context jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  error text
);
ALTER TABLE public.flow_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY fr_view ON public.flow_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY fr_manage ON public.flow_runs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'fundador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'fundador'::app_role));

CREATE TABLE public.flow_run_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.flow_runs(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  node_type text NOT NULL,
  status text NOT NULL,
  output jsonb,
  error text,
  executed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.flow_run_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY frs_view ON public.flow_run_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY frs_manage ON public.flow_run_steps FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'fundador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'fundador'::app_role));

-- Seed default pipeline
INSERT INTO public.project_pipelines (nome, ordem, ativo, is_default)
VALUES ('Projetos Palacios', 0, true, true);

INSERT INTO public.project_stages (pipeline_id, nome, ordem, cor, is_final)
SELECT id, s.nome, s.ordem, s.cor, s.is_final FROM public.project_pipelines,
  (VALUES
    ('Onboarding', 0, '#3b82f6', false),
    ('Briefing', 1, '#8b5cf6', false),
    ('Em Produção', 2, '#f59e0b', false),
    ('Revisão', 3, '#ec4899', false),
    ('Entregue', 4, '#10b981', true),
    ('Pós-venda', 5, '#64748b', false)
  ) AS s(nome, ordem, cor, is_final)
WHERE project_pipelines.is_default = true;
