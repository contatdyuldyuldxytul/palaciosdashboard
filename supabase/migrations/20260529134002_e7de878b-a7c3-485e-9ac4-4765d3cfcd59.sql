
-- 1. Field definitions
CREATE TABLE IF NOT EXISTS public.crm_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('person','organization','deal')),
  field_key text NOT NULL,
  name text NOT NULL,
  field_type text,
  options jsonb,
  pipedrive_field_id bigint,
  is_custom boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, field_key)
);

GRANT SELECT ON public.crm_field_definitions TO authenticated;
GRANT ALL ON public.crm_field_definitions TO service_role;

ALTER TABLE public.crm_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "field_defs_view" ON public.crm_field_definitions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "field_defs_manage" ON public.crm_field_definitions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'fundador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'fundador'::app_role));

-- 2. Custom fields jsonb + novas colunas
ALTER TABLE public.crm_persons        ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.crm_organizations  ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.crm_organizations  ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE public.crm_organizations  ADD COLUMN IF NOT EXISTS endereco_completo text;
