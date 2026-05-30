
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.whatsapp_instance_status AS ENUM ('disconnected','connecting','connected','error');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.whatsapp_msg_direction AS ENUM ('in','out');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.whatsapp_msg_status AS ENUM ('pending','sent','delivered','read','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.whatsapp_sched_status AS ENUM ('pending','sent','failed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ whatsapp_instances ============
CREATE TABLE public.whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  instance_name TEXT NOT NULL UNIQUE,
  status public.whatsapp_instance_status NOT NULL DEFAULT 'disconnected',
  phone_number TEXT,
  profile_name TEXT,
  profile_picture_url TEXT,
  qr_code TEXT,
  qr_updated_at TIMESTAMPTZ,
  last_connected_at TIMESTAMPTZ,
  last_disconnected_at TIMESTAMPTZ,
  webhook_configured BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_instances TO authenticated;
GRANT ALL ON public.whatsapp_instances TO service_role;

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own instance or fundador all"
ON public.whatsapp_instances FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'fundador'));

CREATE POLICY "users insert own instance"
ON public.whatsapp_instances FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'fundador'));

CREATE POLICY "users update own instance or fundador"
ON public.whatsapp_instances FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'fundador'));

CREATE POLICY "users delete own instance or fundador"
ON public.whatsapp_instances FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'fundador'));

CREATE TRIGGER whatsapp_instances_updated
BEFORE UPDATE ON public.whatsapp_instances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ whatsapp_messages ============
CREATE TABLE public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  direction public.whatsapp_msg_direction NOT NULL,
  remote_jid TEXT NOT NULL,
  message_id TEXT,
  content TEXT,
  media_url TEXT,
  media_type TEXT,
  status public.whatsapp_msg_status NOT NULL DEFAULT 'pending',
  deal_id UUID,
  person_id UUID,
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  error_message TEXT,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_messages_instance ON public.whatsapp_messages(instance_id, created_at DESC);
CREATE INDEX idx_wa_messages_remote_jid ON public.whatsapp_messages(remote_jid);
CREATE INDEX idx_wa_messages_deal ON public.whatsapp_messages(deal_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_messages TO service_role;

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view messages of own instance or fundador"
ON public.whatsapp_messages FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'fundador')
  OR EXISTS (SELECT 1 FROM public.whatsapp_instances i WHERE i.id = whatsapp_messages.instance_id AND i.user_id = auth.uid())
);

CREATE POLICY "users insert messages on own instance"
ON public.whatsapp_messages FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'fundador')
  OR EXISTS (SELECT 1 FROM public.whatsapp_instances i WHERE i.id = whatsapp_messages.instance_id AND i.user_id = auth.uid())
);

-- ============ whatsapp_scheduled_messages ============
CREATE TABLE public.whatsapp_scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  to_number TEXT NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status public.whatsapp_sched_status NOT NULL DEFAULT 'pending',
  deal_id UUID,
  person_id UUID,
  error_message TEXT,
  sent_message_id UUID REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_sched_status_time ON public.whatsapp_scheduled_messages(status, scheduled_for);
CREATE INDEX idx_wa_sched_instance ON public.whatsapp_scheduled_messages(instance_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_scheduled_messages TO authenticated;
GRANT ALL ON public.whatsapp_scheduled_messages TO service_role;

ALTER TABLE public.whatsapp_scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view sched of own instance or fundador"
ON public.whatsapp_scheduled_messages FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'fundador')
  OR EXISTS (SELECT 1 FROM public.whatsapp_instances i WHERE i.id = whatsapp_scheduled_messages.instance_id AND i.user_id = auth.uid())
);

CREATE POLICY "users insert sched on own instance"
ON public.whatsapp_scheduled_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = created_by AND (
    public.has_role(auth.uid(), 'fundador')
    OR EXISTS (SELECT 1 FROM public.whatsapp_instances i WHERE i.id = whatsapp_scheduled_messages.instance_id AND i.user_id = auth.uid())
  )
);

CREATE POLICY "users update own sched or fundador"
ON public.whatsapp_scheduled_messages FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'fundador')
  OR EXISTS (SELECT 1 FROM public.whatsapp_instances i WHERE i.id = whatsapp_scheduled_messages.instance_id AND i.user_id = auth.uid())
);

CREATE POLICY "users delete own sched or fundador"
ON public.whatsapp_scheduled_messages FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'fundador')
  OR EXISTS (SELECT 1 FROM public.whatsapp_instances i WHERE i.id = whatsapp_scheduled_messages.instance_id AND i.user_id = auth.uid())
);

CREATE TRIGGER whatsapp_sched_updated
BEFORE UPDATE ON public.whatsapp_scheduled_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ whatsapp_webhook_events (debug) ============
CREATE TABLE public.whatsapp_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT,
  instance_name TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_events_created ON public.whatsapp_webhook_events(created_at DESC);

GRANT SELECT ON public.whatsapp_webhook_events TO authenticated;
GRANT ALL ON public.whatsapp_webhook_events TO service_role;

ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fundador view all webhook events"
ON public.whatsapp_webhook_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'fundador'));

-- ============ Realtime ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_instances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_scheduled_messages;
