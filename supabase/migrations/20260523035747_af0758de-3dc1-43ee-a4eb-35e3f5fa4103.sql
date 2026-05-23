
-- Email messages synchronized from Gmail
CREATE TABLE IF NOT EXISTS public.email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_message_id TEXT UNIQUE NOT NULL,
  gmail_thread_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  from_email TEXT,
  from_name TEXT,
  to_emails TEXT[],
  cc_emails TEXT[],
  subject TEXT,
  snippet TEXT,
  body_html TEXT,
  body_text TEXT,
  received_at TIMESTAMPTZ NOT NULL,
  is_read BOOLEAN DEFAULT false,
  labels TEXT[],
  deal_id UUID REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  person_id UUID REFERENCES public.crm_persons(id) ON DELETE SET NULL,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_messages_thread ON public.email_messages(gmail_thread_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_deal ON public.email_messages(deal_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_received ON public.email_messages(received_at DESC);

ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read email_messages" ON public.email_messages
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write email_messages" ON public.email_messages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Sequences
CREATE TABLE IF NOT EXISTS public.email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT false,
  trigger_type TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual','stage_enter')),
  trigger_stage_id UUID REFERENCES public.crm_stages(id) ON DELETE SET NULL,
  owner_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all email_sequences" ON public.email_sequences
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_email_sequences_updated BEFORE UPDATE ON public.email_sequences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Steps
CREATE TABLE IF NOT EXISTS public.email_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL,
  dia_offset INTEGER NOT NULL DEFAULT 0,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_sequence_steps_seq ON public.email_sequence_steps(sequence_id, ordem);

ALTER TABLE public.email_sequence_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all email_sequence_steps" ON public.email_sequence_steps
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enrollments
CREATE TABLE IF NOT EXISTS public.email_sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  person_id UUID REFERENCES public.crm_persons(id) ON DELETE SET NULL,
  owner_user_id UUID,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled_replied','cancelled_manual')),
  cancelled_reason TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sequence_id, deal_id)
);

CREATE INDEX IF NOT EXISTS idx_email_enrollments_status ON public.email_sequence_enrollments(status);

ALTER TABLE public.email_sequence_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all email_sequence_enrollments" ON public.email_sequence_enrollments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_email_enrollments_updated BEFORE UPDATE ON public.email_sequence_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Drafts created in Gmail awaiting approval
CREATE TABLE IF NOT EXISTS public.email_sequence_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.email_sequence_enrollments(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.email_sequence_steps(id) ON DELETE CASCADE,
  scheduled_for DATE NOT NULL,
  gmail_draft_id TEXT,
  rendered_subject TEXT,
  rendered_body TEXT,
  recipient_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','draft_created','sent','skipped','failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(enrollment_id, step_id)
);

ALTER TABLE public.email_sequence_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all email_sequence_drafts" ON public.email_sequence_drafts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger to auto-enroll on stage change
CREATE OR REPLACE FUNCTION public.crm_deals_stage_change_enroll_sequence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _seq RECORD;
BEGIN
  IF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
    FOR _seq IN
      SELECT id FROM public.email_sequences
      WHERE ativo = true AND trigger_type = 'stage_enter' AND trigger_stage_id = NEW.stage_id
    LOOP
      INSERT INTO public.email_sequence_enrollments (sequence_id, deal_id, person_id, owner_user_id)
      VALUES (_seq.id, NEW.id, NEW.person_id, NEW.owner_user_id)
      ON CONFLICT (sequence_id, deal_id) DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_deals_enroll_sequence ON public.crm_deals;
CREATE TRIGGER trg_crm_deals_enroll_sequence
  AFTER UPDATE ON public.crm_deals
  FOR EACH ROW EXECUTE FUNCTION public.crm_deals_stage_change_enroll_sequence();
