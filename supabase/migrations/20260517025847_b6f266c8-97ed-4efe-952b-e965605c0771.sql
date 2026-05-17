ALTER TABLE public.weekly_plans
  ADD COLUMN IF NOT EXISTS cadencia_semana JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS meta_milena_dia INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS estrategias_fora_da_caixa JSONB NOT NULL DEFAULT '[]'::jsonb;