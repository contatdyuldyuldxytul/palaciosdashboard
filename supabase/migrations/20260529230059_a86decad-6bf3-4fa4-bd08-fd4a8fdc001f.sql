-- Add parts column for storing AI SDK UIMessage parts (tool calls, results, text)
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS parts jsonb;

-- Audit table for AI assistant actions (writes only)
CREATE TABLE IF NOT EXISTS public.ai_assistant_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  assistant text NOT NULL,
  tool_name text NOT NULL,
  input jsonb,
  output jsonb,
  affected_count integer DEFAULT 0,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ai_assistant_actions TO authenticated;
GRANT ALL ON public.ai_assistant_actions TO service_role;

ALTER TABLE public.ai_assistant_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own AI actions" ON public.ai_assistant_actions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Fundador views all AI actions" ON public.ai_assistant_actions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'fundador'));

CREATE POLICY "Service role inserts AI actions" ON public.ai_assistant_actions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_actions_user ON public.ai_assistant_actions(user_id, created_at DESC);

-- Storage bucket for AI-generated exports (CSVs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-exports', 'ai-exports', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read AI exports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ai-exports');

CREATE POLICY "Authenticated upload AI exports"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ai-exports');