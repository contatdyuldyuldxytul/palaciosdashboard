## Problema

No painel **CEO → Colaboradores**, as métricas (% Meta, Comissão, Salário) são calculadas de forma diferente do perfil individual de cada vendedor em **Vendas → [Nome]** (`TeamMemberDashboard` / `LdrMemberDashboard`). Resultado: Aline aparece com 12-13% no painel Vendas e com outro valor no CEO.

A causa: o card no CEO está recalculando localmente, em vez de usar as mesmas fontes/fórmulas das páginas individuais.

## Objetivo

O card de cada colaborador no painel CEO deve refletir **exatamente** o que está no perfil de vendas correspondente — sem recálculo divergente.

## Fonte da verdade (extraída de TeamMemberDashboard.tsx)

Para cada vendedor:
- **% Meta exibida no card "META DE REUNIÕES"**: `meetingsAgendadas / metaComercial.meta_demos * 100`
  - `meetingsAgendadas`: count de `meeting_checks` onde `colaborador = nome`, `mes = MM/YYYY`, `agendada = true`
  - `metaComercial`: primeira linha de `metas_comerciais` filtrada por `mes = MM/YYYY`
- **Comissão (SDR — Aline/Felipe)**: `2000 + (meetingsRealized * 30) + (closedValue * 0.04) + projetosComissao.comissao`
  - `meetingsRealized` vem do `MeetingTracker` (estado local). Para o painel CEO, vamos buscar diretamente de `meeting_checks` (count com `realizada = true`).
  - `closedValue`: soma `valor_estimado` dos leads do vendedor com `status = 'fechado'`
  - `projetosComissao`: `useComissaoVendedorByName(nome)`
- **Salário fixo**: já está nas definições (`COLAB_DEFINITIONS`).
- **Status label** ("Excelente / No Caminho / Atenção"): mesma regra do dashboard (`>=80 / >=50 / <50`).

Para Milena (LDR) a fórmula de comissão é diferente — buscar em `LdrMemberDashboard.tsx` e replicar idêntico (mesmo padrão: ler do dashboard e reproduzir literalmente).

## Implementação

### 1. Criar hook compartilhado `src/hooks/useColaboradorStats.ts`

Centraliza o cálculo para que CEO e Vendas usem **a mesma função**. Retorna:
```ts
{
  metaDemos: number,
  metaReceita: number,
  meetingsAgendadas: number,
  meetingsRealized: number,
  closedValue: number,
  reunioesPct: number,        // meetingsAgendadas / metaDemos * 100
  receitaPct: number,         // closedValue / metaReceita * 100
  commission: number,         // fórmula SDR ou LDR conforme tipo
  fixedSalary: number,
  status: 'excelente' | 'no_caminho' | 'atencao'
}
```

Internamente usa: `useMetasComerciais(mes)`, `useLeads()`, `useComissaoVendedorByName(nome)`, e um `useQuery` em `meeting_checks` (count agendadas + realizadas).

### 2. Refatorar `TeamMemberDashboard.tsx` e `LdrMemberDashboard.tsx`

Substituir os cálculos inline pelo `useColaboradorStats(nome)` — garantindo que ambos painéis (Vendas e CEO) consumam o mesmo hook. Manter UI intacta.

### 3. Refatorar `src/pages/ceo/CeoColaboradores.tsx`

No `ColaboradorCard`, substituir o cálculo local de `pct`, `realizado`, `meta` e `comissao` por `useColaboradorStats(colab.nome)`. O card passa a mostrar **exatamente o mesmo "% Meta de Reuniões"** que aparece no card grande do painel Vendas (ex.: Aline 13%, batendo com a imagem enviada).

Atualizar também o **Ranking** para ordenar pela mesma `reunioesPct`.

### 4. Verificação

- Carregar `/vendas/aline` → ler "% META DE REUNIÕES" (ex.: 13%).
- Carregar `/ceo/colaboradores` → card da Aline deve mostrar **13%** idêntico.
- Repetir para Thiago, Milena e Felipe.

## Sem mudanças

- Nenhuma alteração de RLS, migrations ou edge functions.
- Sem mexer em controle de conta/sub-cargo/aprovação do `CeoColaboradores`.
