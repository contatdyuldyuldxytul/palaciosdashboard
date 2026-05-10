
-- Helper trigger function (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Enums
CREATE TYPE strategy_source AS ENUM ('manual', 'claude_session');
CREATE TYPE campaign_status AS ENUM ('active', 'paused', 'done', 'cancelled');
CREATE TYPE campaign_playbook AS ENUM ('cadence_2_0', 'reactivation', 'freela_hunter', 'custom');
CREATE TYPE campaign_lead_status AS ENUM ('active', 'paused', 'done', 'won', 'lost');
CREATE TYPE cadence_period AS ENUM ('morning', 'afternoon');
CREATE TYPE cadence_channel AS ENUM ('email', 'whatsapp', 'linkedin', 'call');
CREATE TYPE activity_type AS ENUM ('cadence', 'strategic', 'reactivation', 'followup', 'meeting', 'custom');
CREATE TYPE activity_source AS ENUM ('auto', 'manual', 'claude_briefing');
CREATE TYPE strategic_input_source AS ENUM ('stale_proposal', 'hot_lead', 'varredura', 'custom');

CREATE TABLE public.monthly_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL UNIQUE,
  cash_target NUMERIC DEFAULT 0,
  operational_minimum NUMERIC DEFAULT 0,
  key_priorities JSONB DEFAULT '[]'::jsonb,
  strategic_focus TEXT,
  allocation JSONB DEFAULT '{}'::jsonb,
  source strategy_source NOT NULL DEFAULT 'manual',
  session_notes TEXT,
  locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.monthly_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ms_view" ON public.monthly_strategies FOR SELECT TO authenticated USING (true);
CREATE POLICY "ms_manage" ON public.monthly_strategies FOR ALL TO authenticated USING (has_role(auth.uid(), 'fundador')) WITH CHECK (has_role(auth.uid(), 'fundador'));

CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_strategy_id UUID REFERENCES public.monthly_strategies(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  owner_user_id BIGINT,
  start_date DATE,
  end_date DATE,
  status campaign_status NOT NULL DEFAULT 'active',
  playbook_type campaign_playbook NOT NULL DEFAULT 'cadence_2_0',
  target_description TEXT,
  kpis JSONB DEFAULT '{}'::jsonb,
  custom_templates JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (monthly_strategy_id, name)
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "c_view" ON public.campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "c_manage" ON public.campaigns FOR ALL TO authenticated USING (has_role(auth.uid(), 'fundador')) WITH CHECK (has_role(auth.uid(), 'fundador'));
CREATE TRIGGER trg_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.campaign_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  pipedrive_deal_id BIGINT,
  lead_name TEXT,
  lead_company TEXT,
  entered_flow_at DATE NOT NULL DEFAULT CURRENT_DATE,
  current_day_in_flow INTEGER NOT NULL DEFAULT 1,
  group_label TEXT CHECK (group_label IN ('A','B')),
  status campaign_lead_status NOT NULL DEFAULT 'active',
  notes TEXT,
  last_synced_at TIMESTAMPTZ,
  UNIQUE (campaign_id, pipedrive_deal_id)
);
ALTER TABLE public.campaign_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cl_view" ON public.campaign_leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "cl_manage" ON public.campaign_leads FOR ALL TO authenticated USING (has_role(auth.uid(), 'fundador')) WITH CHECK (has_role(auth.uid(), 'fundador'));

CREATE TABLE public.cadence_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_type campaign_playbook NOT NULL,
  day_in_flow INTEGER NOT NULL CHECK (day_in_flow BETWEEN 1 AND 10),
  period cadence_period NOT NULL,
  channel cadence_channel NOT NULL,
  task_template TEXT NOT NULL,
  UNIQUE (playbook_type, day_in_flow, period, channel)
);
ALTER TABLE public.cadence_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ct_view" ON public.cadence_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "ct_manage" ON public.cadence_templates FOR ALL TO authenticated USING (has_role(auth.uid(), 'fundador')) WITH CHECK (has_role(auth.uid(), 'fundador'));

CREATE TABLE public.daily_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  assignee_label TEXT,
  scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
  task_type activity_type NOT NULL DEFAULT 'cadence',
  task_description TEXT NOT NULL,
  related_deal_id BIGINT,
  related_campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  source activity_source NOT NULL DEFAULT 'auto',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_da_user_date ON public.daily_activities (user_id, scheduled_date);
CREATE INDEX idx_da_assignee_date ON public.daily_activities (assignee_label, scheduled_date);
ALTER TABLE public.daily_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "da_view" ON public.daily_activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "da_insert" ON public.daily_activities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "da_update" ON public.daily_activities FOR UPDATE TO authenticated USING (true);
CREATE POLICY "da_delete" ON public.daily_activities FOR DELETE TO authenticated USING (has_role(auth.uid(),'fundador'));

CREATE TABLE public.strategic_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  target_user_id UUID,
  target_assignee_label TEXT,
  task_description TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 5,
  source_type strategic_input_source NOT NULL DEFAULT 'custom',
  related_deal_id BIGINT,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ
);
ALTER TABLE public.strategic_inputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "si_view" ON public.strategic_inputs FOR SELECT TO authenticated USING (true);
CREATE POLICY "si_manage" ON public.strategic_inputs FOR ALL TO authenticated USING (has_role(auth.uid(),'fundador')) WITH CHECK (has_role(auth.uid(),'fundador'));

CREATE TABLE public.weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  monthly_strategy_id UUID REFERENCES public.monthly_strategies(id) ON DELETE SET NULL,
  metrics JSONB DEFAULT '{}'::jsonb,
  narrative_text TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (week_start)
);
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wr_view" ON public.weekly_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "wr_manage" ON public.weekly_reports FOR ALL TO authenticated USING (has_role(auth.uid(),'fundador')) WITH CHECK (has_role(auth.uid(),'fundador'));

-- RPCs
CREATE OR REPLACE FUNCTION public.insert_strategic_input(
  _target_user_id UUID,
  _target_assignee_label TEXT,
  _task_description TEXT,
  _priority INTEGER,
  _source_type strategic_input_source,
  _related_deal_id BIGINT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_id UUID;
BEGIN
  INSERT INTO public.strategic_inputs (target_user_id, target_assignee_label, task_description, priority, source_type, related_deal_id)
  VALUES (_target_user_id, _target_assignee_label, _task_description, COALESCE(_priority,5), COALESCE(_source_type,'custom'), _related_deal_id)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.import_monthly_strategy(_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _month DATE;
  _strategy_id UUID;
  _campaign JSONB;
  _campaign_id UUID;
  _lead JSONB;
  _strategy JSONB;
  _campaigns_created INTEGER := 0;
  _leads_created INTEGER := 0;
BEGIN
  _month := (_payload->>'month' || '-01')::DATE;
  _strategy := _payload->'monthly_strategy';

  INSERT INTO public.monthly_strategies (month, cash_target, operational_minimum, key_priorities, strategic_focus, allocation, source, session_notes)
  VALUES (
    _month,
    COALESCE((_strategy->>'cash_target')::NUMERIC, 0),
    COALESCE((_strategy->>'operational_minimum')::NUMERIC, 0),
    COALESCE(_strategy->'key_priorities', '[]'::jsonb),
    _strategy->>'strategic_focus',
    COALESCE(_strategy->'allocation', '{}'::jsonb),
    'claude_session',
    _strategy->>'session_notes'
  )
  ON CONFLICT (month) DO UPDATE SET
    cash_target = EXCLUDED.cash_target,
    operational_minimum = EXCLUDED.operational_minimum,
    key_priorities = EXCLUDED.key_priorities,
    strategic_focus = EXCLUDED.strategic_focus,
    allocation = EXCLUDED.allocation,
    session_notes = EXCLUDED.session_notes
  RETURNING id INTO _strategy_id;

  FOR _campaign IN SELECT * FROM jsonb_array_elements(COALESCE(_payload->'campaigns', '[]'::jsonb))
  LOOP
    INSERT INTO public.campaigns (
      monthly_strategy_id, name, description, owner_user_id, start_date, end_date,
      playbook_type, target_description, kpis, custom_templates
    )
    VALUES (
      _strategy_id,
      _campaign->>'name',
      _campaign->>'description',
      NULLIF(_campaign->>'owner_user_id','')::BIGINT,
      NULLIF(_campaign->>'start_date','')::DATE,
      NULLIF(_campaign->>'end_date','')::DATE,
      COALESCE((_campaign->>'playbook_type')::campaign_playbook, 'cadence_2_0'),
      _campaign->>'target_description',
      COALESCE(_campaign->'kpis', '{}'::jsonb),
      COALESCE(_campaign->'custom_templates', '{}'::jsonb)
    )
    ON CONFLICT (monthly_strategy_id, name) DO UPDATE SET
      description = EXCLUDED.description,
      owner_user_id = EXCLUDED.owner_user_id,
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      playbook_type = EXCLUDED.playbook_type,
      target_description = EXCLUDED.target_description,
      kpis = EXCLUDED.kpis,
      custom_templates = EXCLUDED.custom_templates,
      updated_at = now()
    RETURNING id INTO _campaign_id;

    _campaigns_created := _campaigns_created + 1;

    FOR _lead IN SELECT * FROM jsonb_array_elements(COALESCE(_campaign->'leads', '[]'::jsonb))
    LOOP
      INSERT INTO public.campaign_leads (
        campaign_id, pipedrive_deal_id, lead_name, lead_company, group_label
      )
      VALUES (
        _campaign_id,
        NULLIF(_lead->>'pipedrive_deal_id','')::BIGINT,
        _lead->>'lead_name',
        _lead->>'lead_company',
        _lead->>'group'
      )
      ON CONFLICT (campaign_id, pipedrive_deal_id) DO UPDATE SET
        lead_name = EXCLUDED.lead_name,
        lead_company = EXCLUDED.lead_company,
        group_label = EXCLUDED.group_label;
      _leads_created := _leads_created + 1;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('strategy_id', _strategy_id, 'campaigns', _campaigns_created, 'leads', _leads_created);
END;
$$;

-- Seed cadence_2_0
INSERT INTO public.cadence_templates (playbook_type, day_in_flow, period, channel, task_template) VALUES
('cadence_2_0',1,'morning','email','Enviar e-mail de cadência (D1) para {{lead_name}} ({{lead_company}})'),
('cadence_2_0',1,'morning','whatsapp','Mandar WhatsApp (D1) para {{lead_name}} ({{lead_company}})'),
('cadence_2_0',1,'afternoon','linkedin','Engajar LinkedIn (D1) de {{lead_name}} ({{lead_company}})'),
('cadence_2_0',2,'morning','email','Enviar e-mail (D2) para {{lead_name}} ({{lead_company}})'),
('cadence_2_0',2,'morning','whatsapp','WhatsApp (D2) para {{lead_name}} ({{lead_company}})'),
('cadence_2_0',2,'afternoon','linkedin','LinkedIn (D2) de {{lead_name}} ({{lead_company}})'),
('cadence_2_0',3,'morning','email','E-mail (D3) para {{lead_name}} ({{lead_company}})'),
('cadence_2_0',3,'morning','call','Ligar (D3 manhã) para {{lead_name}} ({{lead_company}})'),
('cadence_2_0',3,'afternoon','call','Ligar (D3 tarde) para {{lead_name}} ({{lead_company}})'),
('cadence_2_0',4,'morning','email','E-mail (D4) para {{lead_name}} ({{lead_company}})'),
('cadence_2_0',4,'morning','call','Ligar (D4 manhã) para {{lead_name}} ({{lead_company}})'),
('cadence_2_0',4,'afternoon','call','Ligar (D4 tarde) para {{lead_name}} ({{lead_company}})'),
('cadence_2_0',5,'morning','call','Ligar (D5 manhã) para {{lead_name}} ({{lead_company}})'),
('cadence_2_0',5,'afternoon','linkedin','LinkedIn (D5) de {{lead_name}} ({{lead_company}})'),
('cadence_2_0',5,'afternoon','whatsapp','WhatsApp (D5) para {{lead_name}} ({{lead_company}})'),
('cadence_2_0',6,'morning','call','Ligar (D6 manhã) para {{lead_name}} ({{lead_company}})'),
('cadence_2_0',6,'morning','linkedin','LinkedIn (D6) de {{lead_name}} ({{lead_company}})'),
('cadence_2_0',6,'afternoon','call','Ligar (D6 tarde) para {{lead_name}} ({{lead_company}})'),
('cadence_2_0',6,'afternoon','whatsapp','WhatsApp (D6) para {{lead_name}} ({{lead_company}})'),
('cadence_2_0',7,'morning','email','E-mail (D7) para {{lead_name}} ({{lead_company}})'),
('cadence_2_0',7,'morning','call','Ligar (D7 manhã) para {{lead_name}} ({{lead_company}})'),
('cadence_2_0',7,'afternoon','call','Ligar (D7 tarde) para {{lead_name}} ({{lead_company}})'),
('cadence_2_0',8,'morning','email','E-mail (D8) para {{lead_name}} ({{lead_company}})'),
('cadence_2_0',8,'morning','call','Ligar (D8 manhã) para {{lead_name}} ({{lead_company}})'),
('cadence_2_0',8,'afternoon','call','Ligar (D8 tarde) para {{lead_name}} ({{lead_company}})'),
('cadence_2_0',9,'morning','call','Ligar (D9 manhã) para {{lead_name}} ({{lead_company}})'),
('cadence_2_0',9,'afternoon','call','Ligar (D9 tarde) para {{lead_name}} ({{lead_company}})'),
('cadence_2_0',9,'afternoon','whatsapp','WhatsApp (D9) para {{lead_name}} ({{lead_company}})'),
('cadence_2_0',10,'morning','call','Ligar (D10 manhã) para {{lead_name}} ({{lead_company}})'),
('cadence_2_0',10,'morning','email','E-mail fechamento (D10) para {{lead_name}} ({{lead_company}})'),
('cadence_2_0',10,'afternoon','email','E-mail despedida (D10) para {{lead_name}} ({{lead_company}})'),
('cadence_2_0',10,'afternoon','whatsapp','WhatsApp final (D10) para {{lead_name}} ({{lead_company}})');

-- Seed monthly_strategy esqueleto
INSERT INTO public.monthly_strategies (month, strategic_focus, source)
VALUES ('2026-05-01', 'Aguardando importação da sessão estratégica.', 'manual')
ON CONFLICT (month) DO NOTHING;

-- Migrar checklist concluído (preserva histórico)
INSERT INTO public.daily_activities (assignee_label, scheduled_date, task_type, task_description, completed, completed_at, source, created_at)
SELECT
  colaborador, data,
  CASE WHEN tarefa_tipo ILIKE '%reun%' OR tarefa_tipo ILIKE '%demo%' THEN 'meeting'::activity_type ELSE 'cadence'::activity_type END,
  tarefa_titulo, true,
  COALESCE(concluido_em, data::timestamptz), 'manual'::activity_source,
  COALESCE(concluido_em, data::timestamptz)
FROM public.checklist_checks WHERE concluido = true;
