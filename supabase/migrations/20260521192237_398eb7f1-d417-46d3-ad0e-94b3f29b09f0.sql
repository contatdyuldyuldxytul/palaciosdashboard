
DO $$ BEGIN
  CREATE TYPE pipeline_flow_type AS ENUM ('cadencia_10_dias','nutricao','vendas','personalizado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.crm_pipelines
  ADD COLUMN IF NOT EXISTS flow_type pipeline_flow_type NOT NULL DEFAULT 'personalizado',
  ADD COLUMN IF NOT EXISTS owner_user_id uuid,
  ADD COLUMN IF NOT EXISTS owner_label text,
  ADD COLUMN IF NOT EXISTS sheet_id text,
  ADD COLUMN IF NOT EXISTS sheet_tab text;
