
CREATE TABLE public.meeting_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes text NOT NULL,
  numero_reuniao integer NOT NULL,
  colaborador text NOT NULL,
  agendada boolean NOT NULL DEFAULT false,
  agendada_em timestamptz,
  realizada boolean NOT NULL DEFAULT false,
  realizada_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mes, numero_reuniao, colaborador)
);

ALTER TABLE public.meeting_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view meeting_checks"
  ON public.meeting_checks FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can manage meeting_checks"
  ON public.meeting_checks FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
