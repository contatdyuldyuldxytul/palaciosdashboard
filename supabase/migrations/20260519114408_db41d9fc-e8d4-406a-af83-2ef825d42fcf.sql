CREATE INDEX IF NOT EXISTS idx_lancamentos_mes      ON public.lancamentos (mes);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data     ON public.lancamentos (data DESC);
CREATE INDEX IF NOT EXISTS idx_crm_deals_pipeline   ON public.crm_deals (pipeline_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_checks_colab ON public.meeting_checks (colaborador, mes);
CREATE INDEX IF NOT EXISTS idx_leads_data_criacao   ON public.leads (data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_crm_acts_deal        ON public.crm_activities (deal_id, scheduled_at);