
-- 1. lancamentos (main financial entries)
CREATE TABLE public.lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL DEFAULT CURRENT_DATE,
  mes text NOT NULL DEFAULT to_char(CURRENT_DATE, 'MM/YYYY'),
  classificacao text NOT NULL CHECK (classificacao IN ('Entrada', 'Saída')),
  descricao text NOT NULL,
  categoria text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view lancamentos" ON public.lancamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Fundador can manage lancamentos" ON public.lancamentos FOR ALL TO authenticated USING (has_role(auth.uid(), 'fundador'::app_role)) WITH CHECK (has_role(auth.uid(), 'fundador'::app_role));

-- 2. balanco (balance sheet monthly snapshot)
CREATE TABLE public.balanco (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes text NOT NULL UNIQUE,
  caixa numeric DEFAULT 0, banco numeric DEFAULT 0,
  duplicatas_receber numeric DEFAULT 0, estoques numeric DEFAULT 0,
  outros_circulante numeric DEFAULT 0,
  titulos_receber_lp numeric DEFAULT 0, imobilizado numeric DEFAULT 0,
  instalacoes numeric DEFAULT 0, equipamentos numeric DEFAULT 0,
  depreciacao numeric DEFAULT 0,
  fornecedores_pagar numeric DEFAULT 0, salarios_pagar numeric DEFAULT 0,
  aluguel_pagar numeric DEFAULT 0, impostos_recolher numeric DEFAULT 0,
  emprestimos_cp numeric DEFAULT 0,
  emprestimos_lp numeric DEFAULT 0, financiamentos_lp numeric DEFAULT 0,
  capital_social numeric DEFAULT 0, resultado_acumulado numeric DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.balanco ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view balanco" ON public.balanco FOR SELECT TO authenticated USING (true);
CREATE POLICY "Fundador can manage balanco" ON public.balanco FOR ALL TO authenticated USING (has_role(auth.uid(), 'fundador'::app_role)) WITH CHECK (has_role(auth.uid(), 'fundador'::app_role));

-- 3. fluxo_caixa (cash flow monthly)
CREATE TABLE public.fluxo_caixa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes text NOT NULL UNIQUE,
  recebimentos_clientes_proj numeric DEFAULT 0, recebimentos_clientes_real numeric DEFAULT 0,
  pagamentos_fornecedores_proj numeric DEFAULT 0, pagamentos_fornecedores_real numeric DEFAULT 0,
  pagamento_pessoal_proj numeric DEFAULT 0, pagamento_pessoal_real numeric DEFAULT 0,
  pagamento_despesas_proj numeric DEFAULT 0, pagamento_despesas_real numeric DEFAULT 0,
  impostos_proj numeric DEFAULT 0, impostos_real numeric DEFAULT 0,
  aquisicao_imobilizado_proj numeric DEFAULT 0, aquisicao_imobilizado_real numeric DEFAULT 0,
  venda_ativos_proj numeric DEFAULT 0, venda_ativos_real numeric DEFAULT 0,
  outros_investimentos_proj numeric DEFAULT 0, outros_investimentos_real numeric DEFAULT 0,
  captacao_emprestimos_proj numeric DEFAULT 0, captacao_emprestimos_real numeric DEFAULT 0,
  pagamento_emprestimos_proj numeric DEFAULT 0, pagamento_emprestimos_real numeric DEFAULT 0,
  aporte_capital_proj numeric DEFAULT 0, aporte_capital_real numeric DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fluxo_caixa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view fluxo_caixa" ON public.fluxo_caixa FOR SELECT TO authenticated USING (true);
CREATE POLICY "Fundador can manage fluxo_caixa" ON public.fluxo_caixa FOR ALL TO authenticated USING (has_role(auth.uid(), 'fundador'::app_role)) WITH CHECK (has_role(auth.uid(), 'fundador'::app_role));

-- 4. custos_config (fixed costs config monthly)
CREATE TABLE public.custos_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes text NOT NULL UNIQUE,
  pessoal numeric DEFAULT 0, aluguel numeric DEFAULT 0,
  condominio_iptu numeric DEFAULT 0, energia_agua_telefone numeric DEFAULT 0,
  internet_ti numeric DEFAULT 0, marketing_publicidade numeric DEFAULT 0,
  contabilidade_juridico numeric DEFAULT 0, financeiro_bancario numeric DEFAULT 0,
  depreciacao numeric DEFAULT 0, seguros numeric DEFAULT 0,
  veiculos numeric DEFAULT 0, diretoria_prolabore numeric DEFAULT 0,
  outros_fixos numeric DEFAULT 0,
  preco_venda_unitario numeric DEFAULT 20000,
  gastos_variaveis_unitarios numeric DEFAULT 0,
  volume_vendas numeric DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.custos_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view custos_config" ON public.custos_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Fundador can manage custos_config" ON public.custos_config FOR ALL TO authenticated USING (has_role(auth.uid(), 'fundador'::app_role)) WITH CHECK (has_role(auth.uid(), 'fundador'::app_role));

-- 5. metas_comerciais (sales goals)
CREATE TABLE public.metas_comerciais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes text NOT NULL UNIQUE,
  total_leads integer DEFAULT 0,
  grupo_a_leads integer DEFAULT 0,
  grupo_b_leads integer DEFAULT 0,
  meta_demos integer DEFAULT 0,
  meta_contratos integer DEFAULT 0,
  meta_receita numeric DEFAULT 0,
  minimo_viavel numeric DEFAULT 70,
  criado_em timestamptz NOT NULL DEFAULT now(),
  aprovado boolean DEFAULT false,
  aprovado_em timestamptz
);
ALTER TABLE public.metas_comerciais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view metas_comerciais" ON public.metas_comerciais FOR SELECT TO authenticated USING (true);
CREATE POLICY "Fundador can manage metas_comerciais" ON public.metas_comerciais FOR ALL TO authenticated USING (has_role(auth.uid(), 'fundador'::app_role)) WITH CHECK (has_role(auth.uid(), 'fundador'::app_role));
