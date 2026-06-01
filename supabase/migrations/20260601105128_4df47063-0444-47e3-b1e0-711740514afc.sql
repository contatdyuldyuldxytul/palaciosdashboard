
-- 1) is_read em messages
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_wa_messages_unread ON public.whatsapp_messages(instance_id, is_read) WHERE direction = 'in' AND is_read = false;

-- 2) whatsapp_campaigns
CREATE TYPE whatsapp_campaign_status AS ENUM ('draft','running','paused','completed','cancelled');

CREATE TABLE public.whatsapp_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  nome text NOT NULL,
  message_template text NOT NULL,
  total integer NOT NULL DEFAULT 0,
  sent integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  status whatsapp_campaign_status NOT NULL DEFAULT 'draft',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_campaigns TO authenticated;
GRANT ALL ON public.whatsapp_campaigns TO service_role;
ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_camp_view" ON public.whatsapp_campaigns FOR SELECT TO authenticated
USING (has_role(auth.uid(),'fundador') OR EXISTS (SELECT 1 FROM whatsapp_instances i WHERE i.id = instance_id AND i.user_id = auth.uid()));

CREATE POLICY "wa_camp_insert" ON public.whatsapp_campaigns FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by AND (has_role(auth.uid(),'fundador') OR EXISTS (SELECT 1 FROM whatsapp_instances i WHERE i.id = instance_id AND i.user_id = auth.uid())));

CREATE POLICY "wa_camp_update" ON public.whatsapp_campaigns FOR UPDATE TO authenticated
USING (has_role(auth.uid(),'fundador') OR created_by = auth.uid());

CREATE POLICY "wa_camp_delete" ON public.whatsapp_campaigns FOR DELETE TO authenticated
USING (has_role(auth.uid(),'fundador') OR created_by = auth.uid());

CREATE TRIGGER whatsapp_campaigns_updated_at BEFORE UPDATE ON public.whatsapp_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_campaigns;

-- 3) scheduled messages: campaign_id + variables
ALTER TABLE public.whatsapp_scheduled_messages
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS recipient_name text;

CREATE INDEX IF NOT EXISTS idx_wa_sched_campaign ON public.whatsapp_scheduled_messages(campaign_id);

-- 4) whatsapp_templates
CREATE TABLE public.whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  nome text NOT NULL,
  conteudo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_templates TO authenticated;
GRANT ALL ON public.whatsapp_templates TO service_role;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_tpl_view" ON public.whatsapp_templates FOR SELECT TO authenticated
USING (has_role(auth.uid(),'fundador') OR owner_user_id = auth.uid());
CREATE POLICY "wa_tpl_insert" ON public.whatsapp_templates FOR INSERT TO authenticated
WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "wa_tpl_update" ON public.whatsapp_templates FOR UPDATE TO authenticated
USING (owner_user_id = auth.uid() OR has_role(auth.uid(),'fundador'));
CREATE POLICY "wa_tpl_delete" ON public.whatsapp_templates FOR DELETE TO authenticated
USING (owner_user_id = auth.uid() OR has_role(auth.uid(),'fundador'));

CREATE TRIGGER whatsapp_templates_updated_at BEFORE UPDATE ON public.whatsapp_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
