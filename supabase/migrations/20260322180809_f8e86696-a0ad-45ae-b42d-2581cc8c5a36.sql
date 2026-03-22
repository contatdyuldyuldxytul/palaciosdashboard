
CREATE TABLE public.strategic_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  tipo text NOT NULL CHECK (tipo IN ('decisao_estrategica', 'aprendizado', 'mudanca_processo', 'observacao_mercado')),
  titulo text NOT NULL,
  descricao text NOT NULL,
  resultado_esperado text,
  tags text[] DEFAULT '{}',
  arquivado boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.strategic_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fundador can manage strategic decisions"
ON public.strategic_decisions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'fundador'));

CREATE POLICY "Fundador can view strategic decisions"
ON public.strategic_decisions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'fundador'));
