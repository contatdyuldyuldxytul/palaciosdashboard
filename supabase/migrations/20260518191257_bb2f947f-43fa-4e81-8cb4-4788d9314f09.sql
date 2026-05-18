
-- Pipelines
CREATE TABLE public.crm_pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ordem int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  nome text NOT NULL,
  ordem int NOT NULL DEFAULT 0,
  cor text DEFAULT '#3b82f6',
  is_won boolean NOT NULL DEFAULT false,
  is_lost boolean NOT NULL DEFAULT false,
  pipedrive_stage_id bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_stages_pipeline ON public.crm_stages(pipeline_id, ordem);

CREATE TABLE public.crm_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  site text,
  segmento text,
  notas text,
  pipedrive_org_id bigint UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.crm_organizations(id) ON DELETE SET NULL,
  nome text NOT NULL,
  email text,
  telefone text,
  cargo text,
  pipedrive_person_id bigint UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_persons_org ON public.crm_persons(organization_id);

CREATE TYPE crm_deal_status AS ENUM ('open', 'won', 'lost');

CREATE TABLE public.crm_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE RESTRICT,
  stage_id uuid NOT NULL REFERENCES public.crm_stages(id) ON DELETE RESTRICT,
  organization_id uuid REFERENCES public.crm_organizations(id) ON DELETE SET NULL,
  person_id uuid REFERENCES public.crm_persons(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  owner_user_id uuid,
  owner_label text,
  status crm_deal_status NOT NULL DEFAULT 'open',
  motivo_perda text,
  expected_close_date date,
  data_fechamento timestamptz,
  stage_entered_at timestamptz NOT NULL DEFAULT now(),
  pipedrive_id bigint UNIQUE,
  origem text DEFAULT 'manual',
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_deals_pipeline_stage ON public.crm_deals(pipeline_id, stage_id);
CREATE INDEX idx_crm_deals_owner ON public.crm_deals(owner_user_id);
CREATE INDEX idx_crm_deals_status ON public.crm_deals(status);

CREATE TYPE crm_activity_type AS ENUM ('ligacao','email','reuniao','tarefa','followup','outro');

CREATE TABLE public.crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  person_id uuid REFERENCES public.crm_persons(id) ON DELETE SET NULL,
  owner_user_id uuid,
  owner_label text,
  tipo crm_activity_type NOT NULL DEFAULT 'tarefa',
  titulo text NOT NULL,
  descricao text,
  scheduled_at timestamptz,
  duracao_min int,
  concluida boolean NOT NULL DEFAULT false,
  concluida_em timestamptz,
  resultado text,
  pipedrive_activity_id bigint UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_activities_deal ON public.crm_activities(deal_id);
CREATE INDEX idx_crm_activities_owner ON public.crm_activities(owner_user_id);
CREATE INDEX idx_crm_activities_scheduled ON public.crm_activities(scheduled_at);

CREATE TABLE public.crm_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  author_user_id uuid,
  author_label text,
  conteudo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_notes_deal ON public.crm_notes(deal_id);

CREATE TABLE public.crm_deal_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  actor_user_id uuid,
  actor_label text,
  evento text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_history_deal ON public.crm_deal_history(deal_id, created_at DESC);

-- Triggers updated_at
CREATE TRIGGER trg_crm_pipelines_updated BEFORE UPDATE ON public.crm_pipelines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_organizations_updated BEFORE UPDATE ON public.crm_organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_persons_updated BEFORE UPDATE ON public.crm_persons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_deals_updated BEFORE UPDATE ON public.crm_deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_activities_updated BEFORE UPDATE ON public.crm_activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto update stage_entered_at when stage_id changes
CREATE OR REPLACE FUNCTION public.crm_deals_stage_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
    NEW.stage_entered_at = now();
    INSERT INTO public.crm_deal_history (deal_id, actor_user_id, evento, payload)
    VALUES (NEW.id, auth.uid(), 'stage_changed', jsonb_build_object('from', OLD.stage_id, 'to', NEW.stage_id));
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.crm_deal_history (deal_id, actor_user_id, evento, payload)
    VALUES (NEW.id, auth.uid(), 'status_changed', jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_crm_deals_stage_change BEFORE UPDATE ON public.crm_deals FOR EACH ROW EXECUTE FUNCTION public.crm_deals_stage_change();

-- Enable RLS
ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deal_history ENABLE ROW LEVEL SECURITY;

-- Policies: pipelines & stages (founder only writes, all read)
CREATE POLICY "crm_pipelines_view" ON public.crm_pipelines FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_pipelines_manage" ON public.crm_pipelines FOR ALL TO authenticated USING (has_role(auth.uid(),'fundador')) WITH CHECK (has_role(auth.uid(),'fundador'));

CREATE POLICY "crm_stages_view" ON public.crm_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_stages_manage" ON public.crm_stages FOR ALL TO authenticated USING (has_role(auth.uid(),'fundador')) WITH CHECK (has_role(auth.uid(),'fundador'));

-- Orgs & persons: all authenticated can read/write
CREATE POLICY "crm_orgs_view" ON public.crm_organizations FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_orgs_insert" ON public.crm_organizations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "crm_orgs_update" ON public.crm_organizations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "crm_orgs_delete" ON public.crm_organizations FOR DELETE TO authenticated USING (has_role(auth.uid(),'fundador'));

CREATE POLICY "crm_persons_view" ON public.crm_persons FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_persons_insert" ON public.crm_persons FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "crm_persons_update" ON public.crm_persons FOR UPDATE TO authenticated USING (true);
CREATE POLICY "crm_persons_delete" ON public.crm_persons FOR DELETE TO authenticated USING (has_role(auth.uid(),'fundador'));

-- Deals: read all, write if owner or founder
CREATE POLICY "crm_deals_view" ON public.crm_deals FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_deals_insert" ON public.crm_deals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "crm_deals_update" ON public.crm_deals FOR UPDATE TO authenticated USING (owner_user_id = auth.uid() OR owner_user_id IS NULL OR has_role(auth.uid(),'fundador'));
CREATE POLICY "crm_deals_delete" ON public.crm_deals FOR DELETE TO authenticated USING (has_role(auth.uid(),'fundador'));

-- Activities: read all, write if owner or founder
CREATE POLICY "crm_acts_view" ON public.crm_activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_acts_insert" ON public.crm_activities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "crm_acts_update" ON public.crm_activities FOR UPDATE TO authenticated USING (owner_user_id = auth.uid() OR owner_user_id IS NULL OR has_role(auth.uid(),'fundador'));
CREATE POLICY "crm_acts_delete" ON public.crm_activities FOR DELETE TO authenticated USING (owner_user_id = auth.uid() OR has_role(auth.uid(),'fundador'));

-- Notes: read all, write if author or founder
CREATE POLICY "crm_notes_view" ON public.crm_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_notes_insert" ON public.crm_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "crm_notes_update" ON public.crm_notes FOR UPDATE TO authenticated USING (author_user_id = auth.uid() OR has_role(auth.uid(),'fundador'));
CREATE POLICY "crm_notes_delete" ON public.crm_notes FOR DELETE TO authenticated USING (author_user_id = auth.uid() OR has_role(auth.uid(),'fundador'));

-- History: read all, insert any authenticated, no update/delete
CREATE POLICY "crm_history_view" ON public.crm_deal_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_history_insert" ON public.crm_deal_history FOR INSERT TO authenticated WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_deals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_activities;
