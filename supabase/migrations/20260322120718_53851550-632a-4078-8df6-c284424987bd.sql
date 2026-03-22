
-- ═══════════════════════════════════════
-- ENUM: Roles
-- ═══════════════════════════════════════
CREATE TYPE public.app_role AS ENUM ('fundador', 'vendedor');
CREATE TYPE public.vendedor_sub_role AS ENUM ('sdr', 'ldr');
CREATE TYPE public.lead_status AS ENUM ('lead', 'contatado', 'reuniao_agendada', 'reuniao_realizada', 'proposta', 'fechado', 'perdido');
CREATE TYPE public.payment_status AS ENUM ('pendente', 'pago', 'atrasado', 'cancelado');

-- ═══════════════════════════════════════
-- PROFILES
-- ═══════════════════════════════════════
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  vendedor_sub_role public.vendedor_sub_role,
  founder_pin TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ═══════════════════════════════════════
-- USER ROLES
-- ═══════════════════════════════════════
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Fundador can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'fundador'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════
-- LEADS
-- ═══════════════════════════════════════
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa TEXT NOT NULL,
  contato TEXT,
  cargo TEXT,
  telefone TEXT,
  email TEXT,
  cidade TEXT,
  estado TEXT,
  status public.lead_status NOT NULL DEFAULT 'lead',
  responsavel_id UUID REFERENCES auth.users(id),
  responsavel_nome TEXT,
  origem TEXT,
  notas TEXT,
  valor_estimado NUMERIC(12,2) DEFAULT 0,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_fechamento TIMESTAMPTZ,
  motivo_perda TEXT,
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update leads" ON public.leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Fundador can delete leads" ON public.leads FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'fundador'));

-- ═══════════════════════════════════════
-- REUNIOES REALIZADAS
-- ═══════════════════════════════════════
CREATE TABLE public.reunioes_realizadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id),
  vendedor_id UUID REFERENCES auth.users(id),
  vendedor_nome TEXT,
  data_reuniao TIMESTAMPTZ NOT NULL DEFAULT now(),
  duracao_minutos INTEGER,
  resultado TEXT,
  notas TEXT,
  gerou_proposta BOOLEAN DEFAULT false,
  valor_proposta NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reunioes_realizadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view reunioes" ON public.reunioes_realizadas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert reunioes" ON public.reunioes_realizadas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update reunioes" ON public.reunioes_realizadas FOR UPDATE TO authenticated USING (true);

-- ═══════════════════════════════════════
-- COMISSOES
-- ═══════════════════════════════════════
CREATE TABLE public.comissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID REFERENCES auth.users(id) NOT NULL,
  vendedor_nome TEXT,
  mes_referencia TEXT NOT NULL,
  salario_fixo NUMERIC(12,2) DEFAULT 0,
  reunioes_realizadas INTEGER DEFAULT 0,
  valor_reunioes NUMERIC(12,2) DEFAULT 0,
  contratos_indicados INTEGER DEFAULT 0,
  valor_contratos NUMERIC(12,2) DEFAULT 0,
  comissao_contratos NUMERIC(12,2) DEFAULT 0,
  leads_gerados INTEGER DEFAULT 0,
  valor_leads NUMERIC(12,2) DEFAULT 0,
  total_comissao NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.comissoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own comissoes" ON public.comissoes FOR SELECT TO authenticated USING (auth.uid() = vendedor_id OR public.has_role(auth.uid(), 'fundador'));
CREATE POLICY "Fundador can manage comissoes" ON public.comissoes FOR ALL USING (public.has_role(auth.uid(), 'fundador'));

-- ═══════════════════════════════════════
-- METAS
-- ═══════════════════════════════════════
CREATE TABLE public.metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo TEXT NOT NULL,
  mes TEXT,
  trimestre TEXT,
  ano INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  meta_receita NUMERIC(12,2) DEFAULT 0,
  realizado_receita NUMERIC(12,2) DEFAULT 0,
  meta_leads INTEGER DEFAULT 0,
  realizado_leads INTEGER DEFAULT 0,
  meta_reunioes INTEGER DEFAULT 0,
  realizado_reunioes INTEGER DEFAULT 0,
  meta_contratos INTEGER DEFAULT 0,
  realizado_contratos INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view metas" ON public.metas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Fundador can manage metas" ON public.metas FOR ALL USING (public.has_role(auth.uid(), 'fundador'));

-- ═══════════════════════════════════════
-- CLIENTES ATIVOS
-- ═══════════════════════════════════════
CREATE TABLE public.clientes_ativos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa TEXT NOT NULL,
  projeto TEXT NOT NULL,
  contato TEXT,
  email TEXT,
  telefone TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  data_inicio TIMESTAMPTZ DEFAULT now(),
  data_previsao TIMESTAMPTZ,
  valor_total NUMERIC(12,2) DEFAULT 0,
  qtd_imagens INTEGER DEFAULT 0,
  inclui_modelagem BOOLEAN DEFAULT false,
  segundos_animacao INTEGER DEFAULT 0,
  progresso INTEGER DEFAULT 0,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes_ativos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view clientes" ON public.clientes_ativos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert clientes" ON public.clientes_ativos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update clientes" ON public.clientes_ativos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Fundador can delete clientes" ON public.clientes_ativos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'fundador'));

-- ═══════════════════════════════════════
-- FINANCEIRO CLIENTES
-- ═══════════════════════════════════════
CREATE TABLE public.financeiro_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes_ativos(id) ON DELETE CASCADE NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  data_vencimento TIMESTAMPTZ,
  data_pagamento TIMESTAMPTZ,
  status public.payment_status NOT NULL DEFAULT 'pendente',
  forma_pagamento TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financeiro_clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view fin clientes" ON public.financeiro_clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Fundador can manage fin clientes" ON public.financeiro_clientes FOR ALL USING (public.has_role(auth.uid(), 'fundador'));

-- ═══════════════════════════════════════
-- FINANCEIRO EMPRESA
-- ═══════════════════════════════════════
CREATE TABLE public.financeiro_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  categoria TEXT NOT NULL,
  subcategoria TEXT,
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  recorrente BOOLEAN DEFAULT false,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financeiro_empresa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fundador can view fin empresa" ON public.financeiro_empresa FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'fundador'));
CREATE POLICY "Fundador can manage fin empresa" ON public.financeiro_empresa FOR ALL USING (public.has_role(auth.uid(), 'fundador'));

-- ═══════════════════════════════════════
-- CHECKLIST PROJETOS
-- ═══════════════════════════════════════
CREATE TABLE public.checklist_projetos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes_ativos(id) ON DELETE CASCADE NOT NULL,
  etapa INTEGER NOT NULL,
  nome_etapa TEXT NOT NULL,
  concluida BOOLEAN DEFAULT false,
  responsavel TEXT,
  data_conclusao TIMESTAMPTZ,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.checklist_projetos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view checklist" ON public.checklist_projetos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update checklist" ON public.checklist_projetos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can insert checklist" ON public.checklist_projetos FOR INSERT TO authenticated WITH CHECK (true);

-- ═══════════════════════════════════════
-- SCRIPTS DE VENDAS
-- ═══════════════════════════════════════
CREATE TABLE public.scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria TEXT NOT NULL,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  favorito BOOLEAN DEFAULT false,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view scripts" ON public.scripts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Fundador can manage scripts" ON public.scripts FOR ALL USING (public.has_role(auth.uid(), 'fundador'));
