
ALTER TABLE public.clientes_ativos
  ADD COLUMN IF NOT EXISTS parcelas jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tem_imagens boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tem_animacao boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tem_tour_virtual boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS valor_tour_virtual numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS servicos_adicionais text,
  ADD COLUMN IF NOT EXISTS valor_servicos_adicionais numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tem_software boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS plano_software text,
  ADD COLUMN IF NOT EXISTS apelidos text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS concluido_em timestamptz;
