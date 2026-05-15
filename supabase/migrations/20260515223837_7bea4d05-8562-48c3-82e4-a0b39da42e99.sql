ALTER TABLE public.lancamentos ADD COLUMN IF NOT EXISTS notas text;
CREATE INDEX IF NOT EXISTS idx_lancamentos_notas ON public.lancamentos(notas);