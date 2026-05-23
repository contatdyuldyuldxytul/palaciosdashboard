ALTER TABLE public.crm_deals
  ADD COLUMN IF NOT EXISTS temperatura text CHECK (temperatura IN ('quente','morno','frio')),
  ADD COLUMN IF NOT EXISTS score_fit smallint CHECK (score_fit BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS score_budget smallint CHECK (score_budget BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS score_urgencia smallint CHECK (score_urgencia BETWEEN 0 AND 10);