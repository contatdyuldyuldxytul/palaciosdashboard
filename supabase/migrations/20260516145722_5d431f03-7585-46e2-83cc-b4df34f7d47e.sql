ALTER TABLE public.clientes_ativos
  ADD COLUMN IF NOT EXISTS recorrente boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vendedor_id uuid;