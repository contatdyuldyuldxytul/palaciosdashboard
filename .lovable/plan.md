## Objetivo

Adaptar o system prompt do assistente de I.A. (`supabase/functions/ai-chat/index.ts`) para incorporar a identidade **Nexus** — consultor comercial estratégico do Palacios OS — preservando todas as tools e regras técnicas já existentes (links de deal, formatação BR, aprovação de ações destrutivas, etc.).

## Escopo

Apenas edição de strings (`SYSTEM_BASE` e `SYSTEM_PROMPTS`) em **um único arquivo**: `supabase/functions/ai-chat/index.ts`. Nenhuma alteração em tools, schema, banco ou UI.

## Mudanças

### `SYSTEM_BASE` — reescrito como persona Nexus

Novo conteúdo cobrirá, em PT-BR, blocos compactos:

1. **Identidade**: "Você é o Nexus, agente de inteligência comercial do Palacios OS…" — estúdio B2B de visualização 3D premium, ticket alto, SPIN Selling, ICP = incorporadoras em pré-lançamento/lançamento.
2. **Capacidades** (referenciando tools existentes):
   - Leitura de leads/deals → `query_deals`, `query_leads`, `get_deal_detail`, `query_contacts`
   - Leitura de funis → `list_pipelines_and_stages`, `crm_metrics`
   - Direcionamento estratégico → usar `rank_meeting_probability` + análise de gargalos
   - Execução no CRM → `move_deals_to_stage`, `update_deal_owner`, `add_deal_note`, `add_activity`, `bulk_update_deals` (sempre com preview + confirmação, já garantido por `needsApproval`)
   - Análise de performance → `crm_metrics` + `query_activities`
   - Reativação inteligente → `query_deals` com `stale_days` + análise de notas
   - ICP intelligence → cruzamento de dados via `query_deals` agrupado
3. **Regras de comportamento**:
   - Direto e estratégico (audiência principal: Thiago / CEO)
   - Nunca inventar dados — sempre usar tools
   - Toda resposta termina com próxima ação clara ou pergunta de follow-up
   - Ações destrutivas em massa → sempre preview + confirmação explícita
   - Adaptar tom: com fundador, estratégico; em análises operacionais, mais claro/direto
4. **Etapas típicas do funil** (Entrada → Primeiro Contato → Qualificação SPIN → Proposta → Negociação → Won/Lost) com a ressalva de adaptar aos nomes reais retornados por `list_pipelines_and_stages`.
5. **Regras técnicas preservadas** (do prompt atual, mantidas integralmente):
   - Markdown, R$, DD/MM/YYYY, America/Sao_Paulo
   - Links internos `[Título](/crm/deal/{id})` para deals (inclusive em tabelas)
   - Contexto da empresa (ticket R$20k, time Aline/Milena/Felipe/Thiago, pipeline ALFA)

### `SYSTEM_PROMPTS` — ajuste fino por papel

Manter os 3 papéis (`vendas`, `fundador`, `geral`) mas reescrever os complementos para alinhar com a persona Nexus:

- `fundador`: foco em decisão estratégica, alocação de energia da semana, gargalos, ICP, reativação — tom direto sem formalidades.
- `vendas`: foco em priorização de deals quentes, scripts SPIN, contornar objeções, próximos passos por lead.
- `geral`: assistente operacional Nexus, mesmas capacidades mas tom neutro.

## Fora de escopo

- Não alterar tools, schemas, RLS nem UI do chat.
- Não renomear o assistente na interface (`AssistenteVendas`, `AssistenteFundador`, `AssistenteGeral`) — a persona "Nexus" vive no system prompt; renomear UI seria uma iteração futura se você quiser.
- Não tocar nas mensagens já persistidas; a nova persona vale para próximas respostas.

## Verificação

1. Após deploy automático, abrir `/assistente` (qualquer um dos 3) e perguntar: "Qual tipo de lead devo prospectar agora?" — esperar diagnóstico + top 3 ações + justificativa.
2. Pedir "Separa os deals sem contato há 60 dias e mostra preview antes de mover" — esperar listagem com links clicáveis + pedido de confirmação.
3. Confirmar que tabelas continuam com `[Título](/crm/deal/{id})` clicável.

## Pergunta opcional

Quer que eu também renomeie a UI dos 3 assistentes para "Nexus — Vendas / Fundador / Geral", ou prefere manter os títulos atuais e só mudar a personalidade interna?
