
-- =========== Email Signatures ===========
CREATE TABLE public.email_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  corpo_html text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  owner_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_signatures TO authenticated;
GRANT ALL ON public.email_signatures TO service_role;
ALTER TABLE public.email_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_signatures" ON public.email_signatures FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_email_signatures_updated_at BEFORE UPDATE ON public.email_signatures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========== Audience Segments ===========
CREATE TABLE public.email_audience_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  filtros jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_audience_segments TO authenticated;
GRANT ALL ON public.email_audience_segments TO service_role;
ALTER TABLE public.email_audience_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_segments" ON public.email_audience_segments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_segments_updated_at BEFORE UPDATE ON public.email_audience_segments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========== Suppressions ===========
CREATE TABLE public.email_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  motivo text NOT NULL DEFAULT 'manual',
  detalhe text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_email_suppressions_email ON public.email_suppressions(lower(email));
GRANT SELECT, INSERT, DELETE ON public.email_suppressions TO authenticated;
GRANT ALL ON public.email_suppressions TO service_role;
ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_view_suppressions" ON public.email_suppressions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_suppressions" ON public.email_suppressions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "fundador_delete_suppressions" ON public.email_suppressions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'fundador'::app_role));

-- =========== Unsubscribe Tokens (público, sem auth) ===========
CREATE TABLE public.email_unsubscribe_tokens (
  token text PRIMARY KEY,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);
CREATE INDEX idx_unsub_email ON public.email_unsubscribe_tokens(email);
GRANT SELECT, INSERT, UPDATE ON public.email_unsubscribe_tokens TO anon, authenticated;
GRANT ALL ON public.email_unsubscribe_tokens TO service_role;
ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_unsub_select" ON public.email_unsubscribe_tokens FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anyone_unsub_insert" ON public.email_unsubscribe_tokens FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anyone_unsub_update" ON public.email_unsubscribe_tokens FOR UPDATE TO anon, authenticated USING (true);

-- =========== Alter existing tables ===========
ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS categoria text DEFAULT 'outros',
  ADD COLUMN IF NOT EXISTS arquivado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vezes_usado integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS thumbnail_html text;

ALTER TABLE public.email_campaigns
  ADD COLUMN IF NOT EXISTS anexos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS segment_id uuid,
  ADD COLUMN IF NOT EXISTS parent_campaign_id uuid,
  ADD COLUMN IF NOT EXISTS teste_enviado_para text;

ALTER TABLE public.email_campaign_recipients
  ADD COLUMN IF NOT EXISTS urls_clicadas jsonb NOT NULL DEFAULT '[]'::jsonb;

-- =========== Storage buckets ===========
INSERT INTO storage.buckets (id, name, public) VALUES ('email-attachments', 'email-attachments', false)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('email-inline-images', 'email-inline-images', true)
  ON CONFLICT (id) DO NOTHING;

-- Policies para anexos (privado, auth)
CREATE POLICY "auth_read_attachments" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'email-attachments');
CREATE POLICY "auth_insert_attachments" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'email-attachments');
CREATE POLICY "auth_delete_attachments" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'email-attachments');

-- Policies para inline images (public read, auth write)
CREATE POLICY "public_read_inline" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'email-inline-images');
CREATE POLICY "auth_insert_inline" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'email-inline-images');
CREATE POLICY "auth_delete_inline" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'email-inline-images');
