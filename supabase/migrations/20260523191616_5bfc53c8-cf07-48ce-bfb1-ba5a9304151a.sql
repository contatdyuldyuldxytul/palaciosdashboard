ALTER TABLE public.flows ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'projects';
CREATE INDEX IF NOT EXISTS idx_flows_scope ON public.flows(scope);