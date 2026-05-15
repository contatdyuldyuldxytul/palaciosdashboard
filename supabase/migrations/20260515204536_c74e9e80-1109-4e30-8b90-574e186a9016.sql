CREATE TABLE public.login_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  email text,
  user_agent text,
  logged_in_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_events_user_time ON public.login_events (user_id, logged_in_at DESC);

ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can insert own login event"
ON public.login_events FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Fundador can view all login events"
ON public.login_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'fundador'::app_role));

CREATE POLICY "Users can view own login events"
ON public.login_events FOR SELECT TO authenticated
USING (auth.uid() = user_id);