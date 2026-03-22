ALTER TABLE public.comissoes DROP CONSTRAINT IF EXISTS comissoes_vendedor_id_fkey;
ALTER TABLE public.checklist_projetos DROP CONSTRAINT IF EXISTS checklist_projetos_cliente_id_fkey;
ALTER TABLE public.checklist_projetos ALTER COLUMN cliente_id TYPE text;
ALTER TABLE public.financeiro_clientes DROP CONSTRAINT IF EXISTS financeiro_clientes_cliente_id_fkey;
ALTER TABLE public.financeiro_clientes ALTER COLUMN cliente_id TYPE text;