
ALTER TABLE public.crm_pipelines ADD COLUMN IF NOT EXISTS flow_id uuid NULL;
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS flow_started_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.flow_task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  flow_id uuid NOT NULL,
  node_id text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  completed_by uuid NULL,
  nota text NULL,
  UNIQUE (deal_id, flow_id, node_id)
);

ALTER TABLE public.flow_task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ftc_view" ON public.flow_task_completions FOR SELECT TO authenticated USING (true);
CREATE POLICY "ftc_manage" ON public.flow_task_completions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ftc_deal ON public.flow_task_completions(deal_id);
CREATE INDEX IF NOT EXISTS idx_ftc_flow ON public.flow_task_completions(flow_id);
