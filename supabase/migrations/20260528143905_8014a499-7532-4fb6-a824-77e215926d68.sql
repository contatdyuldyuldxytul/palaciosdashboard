
-- Organizações: campos adicionais
ALTER TABLE public.crm_organizations
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS pais text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS raw_payload jsonb;

-- Pessoas: campos adicionais
ALTER TABLE public.crm_persons
  ADD COLUMN IF NOT EXISTS emails jsonb,
  ADD COLUMN IF NOT EXISTS telefones jsonb,
  ADD COLUMN IF NOT EXISTS raw_payload jsonb;

-- Log de execuções automáticas de importação
CREATE TABLE IF NOT EXISTS public.pipedrive_import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  success boolean,
  summary jsonb,
  error text
);

GRANT SELECT ON public.pipedrive_import_runs TO authenticated;
GRANT ALL ON public.pipedrive_import_runs TO service_role;

ALTER TABLE public.pipedrive_import_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fundador can view import runs"
  ON public.pipedrive_import_runs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'fundador'::app_role));
