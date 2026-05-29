
-- Email campaigns infrastructure for Resend integration

CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  from_email TEXT NOT NULL DEFAULT 'contato@palacios3dstudio.com',
  from_name TEXT NOT NULL DEFAULT 'Palácios 3D Studio',
  reply_to TEXT,
  criado_por UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sending','sent','failed')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  total_sent INTEGER NOT NULL DEFAULT 0,
  total_delivered INTEGER NOT NULL DEFAULT 0,
  total_opened INTEGER NOT NULL DEFAULT 0,
  total_clicked INTEGER NOT NULL DEFAULT 0,
  total_bounced INTEGER NOT NULL DEFAULT 0,
  total_failed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_campaigns TO authenticated;
GRANT ALL ON public.email_campaigns TO service_role;

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fundador_all_campaigns" ON public.email_campaigns
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'fundador'))
  WITH CHECK (public.has_role(auth.uid(), 'fundador'));

CREATE POLICY "owner_select_campaigns" ON public.email_campaigns
  FOR SELECT TO authenticated
  USING (criado_por = auth.uid());

CREATE POLICY "owner_insert_campaigns" ON public.email_campaigns
  FOR INSERT TO authenticated
  WITH CHECK (criado_por = auth.uid());

CREATE POLICY "owner_update_campaigns" ON public.email_campaigns
  FOR UPDATE TO authenticated
  USING (criado_por = auth.uid());

CREATE TRIGGER email_campaigns_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE IF NOT EXISTS public.email_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  deal_id UUID,
  person_id UUID,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  resend_message_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','opened','clicked','bounced','complained','failed')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  first_opened_at TIMESTAMPTZ,
  last_opened_at TIMESTAMPTZ,
  open_count INTEGER NOT NULL DEFAULT 0,
  first_clicked_at TIMESTAMPTZ,
  last_clicked_at TIMESTAMPTZ,
  click_count INTEGER NOT NULL DEFAULT 0,
  bounce_reason TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ecr_campaign ON public.email_campaign_recipients(campaign_id);
CREATE INDEX idx_ecr_deal ON public.email_campaign_recipients(deal_id);
CREATE INDEX idx_ecr_email ON public.email_campaign_recipients(recipient_email);
CREATE INDEX idx_ecr_message ON public.email_campaign_recipients(resend_message_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_campaign_recipients TO authenticated;
GRANT ALL ON public.email_campaign_recipients TO service_role;

ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fundador_all_recipients" ON public.email_campaign_recipients
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'fundador'))
  WITH CHECK (public.has_role(auth.uid(), 'fundador'));

CREATE POLICY "owner_select_recipients" ON public.email_campaign_recipients
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.email_campaigns c WHERE c.id = campaign_id AND c.criado_por = auth.uid()));

CREATE TRIGGER email_campaign_recipients_updated_at
  BEFORE UPDATE ON public.email_campaign_recipients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  criado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all_templates" ON public.email_templates
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Enable realtime for live tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_campaign_recipients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_campaigns;
