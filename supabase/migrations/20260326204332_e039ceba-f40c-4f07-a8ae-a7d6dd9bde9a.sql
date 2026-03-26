
-- Monthly goals set by CEO
CREATE TABLE public.metas_mensais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mes_ano TEXT NOT NULL UNIQUE,
  leads_milena INTEGER NOT NULL DEFAULT 0,
  leads_contatados_aline INTEGER NOT NULL DEFAULT 0,
  demos_aline INTEGER NOT NULL DEFAULT 0,
  contratos INTEGER NOT NULL DEFAULT 0,
  minimo_viavel INTEGER NOT NULL DEFAULT 70,
  receita_esperada NUMERIC NOT NULL DEFAULT 0,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.metas_mensais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fundador can manage metas_mensais" ON public.metas_mensais
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'fundador'));

CREATE POLICY "Authenticated can view metas_mensais" ON public.metas_mensais
  FOR SELECT TO authenticated
  USING (true);

-- Daily goal distribution
CREATE TABLE public.metas_distribuidas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mes_ano TEXT NOT NULL,
  data DATE NOT NULL,
  leads_milena_dia INTEGER NOT NULL DEFAULT 0,
  leads_contatados_dia INTEGER NOT NULL DEFAULT 0,
  demos_dia INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.metas_distribuidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fundador can manage metas_distribuidas" ON public.metas_distribuidas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'fundador'));

CREATE POLICY "Authenticated can view metas_distribuidas" ON public.metas_distribuidas
  FOR SELECT TO authenticated
  USING (true);

-- Checklist task completion tracking
CREATE TABLE public.checklist_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  colaborador TEXT NOT NULL,
  tarefa_id TEXT NOT NULL,
  tarefa_titulo TEXT NOT NULL,
  tarefa_tipo TEXT,
  concluido BOOLEAN NOT NULL DEFAULT false,
  concluido_em TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.checklist_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage checklist_checks" ON public.checklist_checks
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Goal reports
CREATE TABLE public.relatorios_meta (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mes_ano TEXT NOT NULL,
  data_geracao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  conteudo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'atraso_meta'
);

ALTER TABLE public.relatorios_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fundador can manage relatorios_meta" ON public.relatorios_meta
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'fundador'));

CREATE POLICY "Authenticated can view relatorios_meta" ON public.relatorios_meta
  FOR SELECT TO authenticated
  USING (true);
