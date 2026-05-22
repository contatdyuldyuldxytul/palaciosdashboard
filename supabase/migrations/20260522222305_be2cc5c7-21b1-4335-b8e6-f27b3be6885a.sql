
ALTER TABLE public.crm_deals
  ADD COLUMN IF NOT EXISTS probabilidade integer,
  ADD COLUMN IF NOT EXISTS label_ids uuid[] NOT NULL DEFAULT '{}';

ALTER TABLE public.crm_persons
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS linkedin text;

ALTER TABLE public.crm_organizations
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS num_colaboradores integer,
  ADD COLUMN IF NOT EXISTS porte text,
  ADD COLUMN IF NOT EXISTS faturamento numeric,
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS linkedin text,
  ADD COLUMN IF NOT EXISTS whatsapp text;

CREATE TABLE IF NOT EXISTS public.crm_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  cor text NOT NULL DEFAULT '#64748b',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_labels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_labels_view ON public.crm_labels;
DROP POLICY IF EXISTS crm_labels_manage ON public.crm_labels;

CREATE POLICY crm_labels_view ON public.crm_labels FOR SELECT TO authenticated USING (true);
CREATE POLICY crm_labels_manage ON public.crm_labels FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.crm_labels (nome, cor) VALUES
  ('FALHOU A LIGAÇÃO', '#374151'),
  ('CONTINUAR O FLUXO NORMALMENTE', '#facc15'),
  ('LIGAR DEPOIS', '#10b981'),
  ('WHATSAPP', '#2563eb'),
  ('NÚMERO PASSADO PARA O DECISOR', '#7c3aed'),
  ('NÃO PODE ATENDER', '#ef4444'),
  ('PRÉ LANÇAMENTO', '#f9a8d4'),
  ('THIAGO', '#3b82f6'),
  ('CONTATO POR EMAIL SOMENTE', '#fb923c'),
  ('ALINE', '#ec4899')
ON CONFLICT (nome) DO NOTHING;
