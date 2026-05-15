CREATE TABLE public.weekly_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start date NOT NULL,
  week_end date NOT NULL,
  estrategia_semana text DEFAULT '',
  prioridades jsonb NOT NULL DEFAULT '[]'::jsonb,
  extras_aline jsonb NOT NULL DEFAULT '[]'::jsonb,
  extras_felipe jsonb NOT NULL DEFAULT '[]'::jsonb,
  extras_milena jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY wp_view ON public.weekly_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY wp_manage ON public.weekly_plans FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'fundador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'fundador'::app_role));

CREATE TRIGGER weekly_plans_updated_at
  BEFORE UPDATE ON public.weekly_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_weekly_plans_created_at ON public.weekly_plans (created_at DESC);