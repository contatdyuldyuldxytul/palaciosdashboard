
-- Create planejamento_mensal table
CREATE TABLE public.planejamento_mensal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mes_ano TEXT NOT NULL,
  data DATE NOT NULL,
  dia_semana TEXT NOT NULL,
  ciclo_dia INTEGER NOT NULL DEFAULT 0,
  grupo TEXT,
  responsavel TEXT NOT NULL,
  tarefas_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  aprovado BOOLEAN NOT NULL DEFAULT false,
  aprovado_em TIMESTAMP WITH TIME ZONE,
  editado BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.planejamento_mensal ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated can view planejamento"
  ON public.planejamento_mensal FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Fundador can manage planejamento"
  ON public.planejamento_mensal FOR ALL
  TO authenticated USING (has_role(auth.uid(), 'fundador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'fundador'::app_role));

-- Add grupo and periodo columns to checklist_checks if not exist
ALTER TABLE public.checklist_checks ADD COLUMN IF NOT EXISTS grupo TEXT;
ALTER TABLE public.checklist_checks ADD COLUMN IF NOT EXISTS periodo TEXT;
