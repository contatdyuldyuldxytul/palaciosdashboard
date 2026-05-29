# Plano: Assistente de I.A. com acesso total + ações executáveis

Hoje o `ai-chat` só recebe a conversa e responde texto — sem ler banco, sem agir. Vou transformá-lo num **agente com tools** (function calling) usando o AI SDK, com acesso de leitura ampla e ações controladas sobre leads/deals/pipelines.

## O que muda na experiência

No `/assistente` (Assistente Geral, de Vendas e do Fundador) o usuário poderá pedir, em linguagem natural:

- "Qual lead tem maior probabilidade de fechar uma reunião?" → IA consulta deals + notas + estágios e responde com ranking justificado.
- "Me dê 400 leads prospectados parados há mais de X dias em uma planilha" → IA filtra e gera CSV em `/mnt/documents` com link de download na conversa.
- "Mova todos os deals do estágio A para o estágio B no pipeline X" → IA mostra preview (quantos, quais), pede confirmação no chat, e executa.
- "Resuma o pipeline Aline hoje", "Quais clientes não têm follow-up há 7 dias?", "Top 10 deals por valor", etc.

Cada ação aparece no chat como um "card de tool" (ícone + nome + status + resultado compacto), no padrão do contrato visual de chat já usado.

## Arquitetura

**1. Reescrever `supabase/functions/ai-chat/index.ts` usando AI SDK + tools**

- Trocar o fetch manual por `streamText` do `npm:ai` com provider Lovable AI Gateway (`@ai-sdk/openai-compatible`).
- Manter `google/gemini-2.5-pro` para fundador e `google/gemini-2.5-flash` como default para vendas/geral (melhor custo em loops de tools).
- `stopWhen: stepCountIs(50)` para permitir múltiplas chamadas de tool no mesmo turno.
- Validar JWT do usuário (hoje a function não valida) para escopar permissões.
- Passar `user.id` + `role` (fundador/vendedor) para o handler, e usar isso para gatear tools de escrita.

**2. Catálogo de tools (todas Zod-schema, server-side)**

Leitura (disponível para todos):
- `query_deals` — filtros: pipeline, stage, owner, status, valor min/max, dias parados, tem nota?, texto livre. Retorna até 200 deals (paginação) com campos essenciais.
- `get_deal_detail` — deal + person + org + última atividade + notas + histórico de estágio.
- `query_leads` — equivalente para `leads` (tabela legada de prospecção).
- `list_pipelines_and_stages` — estrutura completa do CRM.
- `query_activities` — tarefas/atividades do CRM filtradas por owner/data/status.
- `query_contacts` — busca contatos por nome/empresa/email/telefone.
- `crm_metrics` — métricas agregadas (taxa de conversão por estágio, ticket médio, tempo médio em estágio, deals parados >N dias).
- `rank_meeting_probability` — heurística servidor: combina estágio, dias desde último contato, presença de notas, valor → score 0–100 com explicação.

Exportação:
- `export_to_csv` — recebe resultado de uma query anterior (ou repete a query) e grava `/mnt/documents/<nome>.csv`. Retorna URL pública via Supabase Storage (bucket `email-attachments` já existe — ou criar `ai-exports` público). O chat mostra botão de download.

Escrita (apenas `fundador`, ou `vendedor` no próprio escopo; sempre com `needsApproval`):
- `move_deals_to_stage` — input: lista de deal_ids OU filtro, target_stage_id. Mostra preview, pede confirmação, executa em lote.
- `update_deal_owner` — reatribuir responsável.
- `add_deal_note` / `add_activity` — criar nota ou tarefa.
- `bulk_update_deals` — campos genéricos (status, valor, tags). Sempre com preview e limite (ex: máx 500 por chamada).

Todas as tools de escrita registram em `crm_deal_history` com `actor_user_id = user.id` e payload indicando "ação via assistente IA".

**3. Atualizar System Prompts**

Reescrever os prompts em `SYSTEM_PROMPTS` para descrever:
- As tools disponíveis e quando usá-las.
- Regra: sempre consultar dados reais antes de responder perguntas quantitativas.
- Regra: para ações de escrita, sempre apresentar preview com contagem + amostra antes de executar.
- Manter a personalidade (consultor de vendas / fundador / geral).

**4. Frontend — `AIChatPage.tsx` + `useAIChat.ts`**

- Migrar `useAIChat` para `useChat` do `@ai-sdk/react` com `DefaultChatTransport` apontando para `/functions/v1/ai-chat`.
- Renderizar `message.parts` em vez de `content` string — para suportar `tool-call` e `tool-result` parts.
- Adicionar componente `<ToolCallCard>` mostrando: ícone (DB/Download/Edit/Move), nome legível ("Consultando leads…", "Exportando CSV…", "Movendo 47 deals…"), status (running/success/error), e resultado compacto (tabela mini, contagem, link de download).
- Para tools com `needsApproval`, mostrar botões "Confirmar / Cancelar" inline.
- Manter persistência em `chat_messages` (já existe), salvando também as tool parts (coluna nova `parts jsonb` ou armazenar tudo em `content` como JSON serializado de UIMessage).

**5. Banco**

- Adicionar coluna `parts jsonb` em `chat_messages` para persistir tool calls/results fielmente. Manter `content` como fallback texto.
- (Opcional) tabela `ai_assistant_actions` para auditoria (user_id, tool_name, input, output, executed_at, deal_ids afetados).

**6. Storage**

- Criar bucket `ai-exports` (público, com signed URL de 7 dias) para CSVs gerados.

## Permissões & Segurança

- Tools de leitura: respeitam RLS do usuário autenticado (uso de client com JWT do usuário, não service role) — vendedor vê só seus deals, fundador vê tudo.
- Tools de escrita: validação extra no servidor por `has_role`. Vendedor só pode escrever em deals onde `owner_user_id = auth.uid()`.
- Toda chamada de tool é logada.

## Detalhes técnicos relevantes

- `supabase/config.toml`: `ai-chat` precisa de `verify_jwt = true` (hoje provavelmente está `false`).
- Edge function fica mais pesada — aumentar timeout se necessário.
- Para CSV usar `npm:papaparse` ou string-building simples.
- `rank_meeting_probability` será uma função SQL ou cálculo TS no servidor; fórmula simples: `score = 0.4*stage_weight + 0.3*recency + 0.2*has_recent_note + 0.1*valor_normalizado`.

## Fora do escopo (pra confirmar se quer depois)

- Integração com Pipedrive direto (hoje sync é via job; mudanças via assistente afetam só Supabase).
- Envio de e-mails/campanhas pelo assistente (já existe UI de campanhas).
- Voice/áudio.

## Perguntas antes de implementar

1. **Escrita pelo assistente**: ok liberar movimentação em massa / reatribuição via chat (com confirmação), ou nesta primeira versão prefere **apenas leitura + export CSV**?
2. **Quem pode usar tools de escrita**: só fundador, ou também vendedores no próprio escopo?
3. **Score de "probabilidade de reunião"**: heurística simples no servidor (rápido, determinístico) ou deixar a IA inferir lendo as notas (mais lento, mais "inteligente")? Posso fazer híbrido: heurística filtra top 20, IA lê notas e re-ranqueia.