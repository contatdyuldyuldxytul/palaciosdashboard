CREATE TABLE public.custom_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  tipo text NOT NULL DEFAULT 'Outro',
  data date NOT NULL DEFAULT CURRENT_DATE,
  responsavel text NOT NULL,
  descricao text,
  quantidade integer,
  criado_por text,
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  concluido boolean NOT NULL DEFAULT false,
  concluido_em timestamp with time zone
);

ALTER TABLE public.custom_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view custom_activities"
  ON public.custom_activities FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can manage custom_activities"
  ON public.custom_activities FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);