
-- Conversations table
CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  assistant text NOT NULL,
  title text NOT NULL DEFAULT 'Nova conversa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_conversations TO authenticated;
GRANT ALL ON public.chat_conversations TO service_role;

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own conversations"
  ON public.chat_conversations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own conversations"
  ON public.chat_conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own conversations"
  ON public.chat_conversations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users delete own conversations"
  ON public.chat_conversations FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_chat_conversations_user_assistant_updated
  ON public.chat_conversations (user_id, assistant, updated_at DESC);

CREATE TRIGGER trg_chat_conversations_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add conversation_id to chat_messages
ALTER TABLE public.chat_messages
  ADD COLUMN conversation_id uuid REFERENCES public.chat_conversations(id) ON DELETE CASCADE;

-- Backfill: 1 conversation per (user_id, assistant)
INSERT INTO public.chat_conversations (id, user_id, assistant, title, created_at, updated_at)
SELECT gen_random_uuid(), user_id, assistant, 'Histórico', MIN(created_at), MAX(created_at)
FROM public.chat_messages
GROUP BY user_id, assistant;

UPDATE public.chat_messages m
SET conversation_id = c.id
FROM public.chat_conversations c
WHERE m.user_id = c.user_id AND m.assistant = c.assistant AND m.conversation_id IS NULL;

ALTER TABLE public.chat_messages
  ALTER COLUMN conversation_id SET NOT NULL;

CREATE INDEX idx_chat_messages_conversation
  ON public.chat_messages (conversation_id, created_at);
