## Reestruturar aba "Atividades" do CRM

Substituir o `Placeholder` em `/crm/atividades` por uma página completa com 3 sub-abas. A aba "Vendas" da sidebar (e suas sub-rotas `/vendas/*`) será removida; tudo migra para dentro de Atividades.

### Estrutura

```text
/crm/atividades
├── /nucleo            Núcleo Operacional   (default)
├── /inteligencia      Inteligência Comercial
└── /gestor            Visão do Gestor      (🔒 cadeado p/ não-CEO)
```

### 1. Núcleo Operacional
- Reaproveita o conteúdo atual de `/vendas/funil` (Funil de Vendas) como visão principal.
- Substitui a navegação "abas por colaborador" (Aline, Milena, Thiago, Felipe na sidebar) por um **seletor de colaborador** (dropdown/segmented control) no topo da aba.
  - Opções: Todos · Aline · Milena · Thiago · Felipe
  - Ao selecionar, renderiza in-place o dashboard do colaborador (`TeamMemberDashboard` / `LdrMemberDashboard` / `ThiagoDashboard`) sem mudar de rota.
- Sub-tabs internas mantidas: Funil, Meus Leads, Scripts, Ligações, Assistente — reaproveitando as páginas existentes (`Funil`, `Leads`, `Scripts`, `AssistenteVendas`).

### 2. Inteligência Comercial
Camada nova sobre `crm_deals`:
- **Temperatura**: Quente / Morno / Frio — badge colorido em cada deal (vermelho/amarelo/azul).
- **Score de qualificação (0–100)**: média ponderada de Fit, Budget, Urgência (cada um 0–10, editável no modal do deal).
- **Motivo de perda obrigatório**: ao mover deal para stage `is_lost`, abre modal exigindo escolher: Preço · Timing · Concorrente · Sem resposta · Outro (com texto livre). Grava em `crm_deals.motivo_perda` (já existe).
- **Painel de padrões**: gráfico de barras "Motivos de perda nos últimos 90 dias" + breakdown de temperatura por stage + score médio por responsável.

### 3. Visão do Gestor (CEO only)
Painel de saúde do pipeline:
- **Volume de atividades por etapa** (count de `crm_deals` por `stage_id` no pipeline atual).
- **Tarefas em atraso por responsável** (`crm_activities` com `scheduled_at < now()` e `concluida=false`, agrupado por `owner_label`).
- **Rastreador de cadência**: tabela de deals com colunas `Último toque` (max `crm_activities.concluida_em` ou `stage_entered_at`), `Próxima ação` (próxima `crm_activities` agendada), `Dias parado`. Ordenado por mais parados primeiro.
- Para não-fundador: tela com `<Lock>` icon + mensagem "Acesso restrito ao CEO" (padrão já usado em outras gates).

### Mudanças técnicas

**Banco** (migration):
- `crm_deals`: adicionar `temperatura text` ('quente'|'morno'|'frio'), `score_fit smallint`, `score_budget smallint`, `score_urgencia smallint`, `score_total smallint generated`.
- Sem mudanças em RLS (políticas existentes cobrem).

**Arquivos**:
- Novo: `src/pages/crm/Atividades.tsx` (container com `SectionTabs` para as 3 sub-abas).
- Novo: `src/components/crm/atividades/NucleoOperacional.tsx` (seletor de colaborador + render condicional).
- Novo: `src/components/crm/atividades/InteligenciaComercial.tsx` + `MotivoPerdaModal.tsx` + `TemperaturaBadge.tsx` + `QualificacaoEditor.tsx`.
- Novo: `src/components/crm/atividades/VisaoGestor.tsx` (com gate por `isFundador`).
- Editar `src/App.tsx`: substituir `Placeholder` em `/crm/atividades` por `Atividades` com sub-rotas; **remover** rota `/vendas` e o `VendasLayout`; manter redirects `/vendas/*` → `/crm/atividades/nucleo/*` para retrocompatibilidade.
- Editar `src/components/AppSidebar.tsx`: remover item "Vendas" e os 4 sub-itens de colaboradores; garantir que "Atividades" fique destacada como entrada principal do fluxo comercial.
- Hook do gancho de perda: editar `KanbanBoard.tsx` para interceptar drop em stage `is_lost` e abrir `MotivoPerdaModal`.

### Pontos a confirmar antes de implementar
1. **Remover sidebar "Vendas" completamente?** Confirmado pelo enunciado ("eliminemos o painel de Vendas") — mas os dashboards `/equipe/aline`, `/equipe/milena` etc. ainda devem existir como rotas standalone (você está em uma agora) ou só dentro do seletor de Atividades?
2. **Score de qualificação**: ok com 3 campos (Fit, Budget, Urgência) editáveis manualmente, ou prefere alguma sugestão automática via IA?
3. **Temperatura**: definida manualmente pelo vendedor, ou calculada automaticamente do score (>70 quente, 40-70 morno, <40 frio)?