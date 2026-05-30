## Objetivo

Adicionar duas funcionalidades ao assistente Nexus:

1. **Desambiguação de funil/etapa** — quando o usuário mencionar pipeline/etapa de forma informal, o agente deve listar opções reais e confirmar antes de executar qualquer ação.
2. **Histórico de conversas estilo Claude/ChatGPT** — múltiplas threads por assistente, com sidebar, título automático, rename e delete.

---

## Parte 1 — Desambiguação (system prompt)

Editar `supabase/functions/ai-chat/index.ts`, adicionando ao `SYSTEM_BASE` um bloco "Desambiguação de funil e etapa":

- Sempre que o usuário mencionar funil/pipeline/etapa de forma vaga ou informal ("reciclagem", "aquecimento", "funil da Aline", "lista fria"), o agente DEVE primeiro chamar `list_pipelines_and_stages`.
- Se houver match claro (1 candidato razoável), confirmar em uma frase curta antes de agir: *"Entendi como 'SDR — Aline'. Confirmo?"*
- Se houver ambiguidade (>1 candidato ou nenhum óbvio), responder com lista numerada dos pipelines/etapas reais e pedir seleção. Modelo:
  ```
  Não identifiquei exatamente qual funil/etapa. Qual desses?
  1. [nome real]
  2. [nome real]
  ```
- Mesmo fluxo se a etapa dentro do funil for ambígua: listar etapas reais do funil escolhido.
- **Nunca** executar `move_deals_to_stage`, `bulk_update_deals`, `update_deal_owner` etc. com funil/etapa ambíguo — confirmação primeiro.

Não tocar em tools nem schemas.

---

## Parte 2 — Histórico de conversas (threads)

### 2.1 Banco

Nova migração:

- Criar tabela `chat_conversations`:
  - `id uuid pk default gen_random_uuid()`
  - `user_id uuid not null`
  - `assistant text not null` (vendas | fundador | geral)
  - `title text not null default 'Nova conversa'`
  - `created_at timestamptz default now()`
  - `updated_at timestamptz default now()`
- GRANTs (`authenticated`, `service_role`) + RLS (`auth.uid() = user_id` para SELECT/INSERT/UPDATE/DELETE).
- Em `chat_messages`: adicionar coluna `conversation_id uuid` com FK para `chat_conversations(id) on delete cascade`, index `(conversation_id, created_at)`.
- Backfill simples: para cada `(user_id, assistant)` existente, criar uma conversa "Histórico" e migrar as mensagens para ela; coluna fica `not null` após o backfill.

### 2.2 Rota dedicada por thread (obrigatório pelo contrato de chat-agent)

Em `src/App.tsx`:

- Manter `/assistente` (lista/landing que cria/seleciona conversa e navega).
- Adicionar `/assistente/:threadId` → renderiza `AssistenteGeral` com `threadId` lido por `useParams`.

A página `/assistente` sem `:threadId`:
- Se houver conversas, redireciona para a mais recente.
- Se não houver, cria uma nova conversa e navega para ela (caminho idempotente, fora de `useEffect` para evitar duplicação em StrictMode).

### 2.3 Hook `useAIChat`

Refatorar para receber `threadId` (obrigatório) e:

- Carregar mensagens **apenas dessa conversa** ordenadas por `created_at`.
- Inserir user/assistant messages com `conversation_id = threadId`.
- `id` do `useChat` keyado em `threadId` para remontar ao trocar de conversa (sem vazar mensagens).
- `clearMessages` agora deleta mensagens *daquela* conversa (não de todo o assistente).
- Atualizar `updated_at` da conversa a cada mensagem (via `onFinish` + envio do usuário).
- Auto-título: ao receber a primeira resposta do assistente em uma conversa cujo title ainda é "Nova conversa", gerar título a partir do texto da primeira mensagem do usuário (truncar ~50 chars, prefixar/sufixar com data DD/MM — ex: *"Reativação de leads — 14/06"*). Implementação client-side simples; sem chamada extra ao modelo.

### 2.4 Sidebar de histórico

Criar `src/components/ai/ChatHistorySidebar.tsx`:

- Lista conversas do `assistant` atual ordenadas por `updated_at desc`.
- Botão "+ Nova conversa" no topo (cria conversa, navega para `/assistente/:newId`).
- Cada item: título + data relativa; click navega para a thread.
- Ações por item (menu de 3 pontos ou hover): **Renomear** (input inline) e **Excluir** (confirmação leve). Sem botões aninhados — usar elementos `<button>` irmãos dentro de um `<div>` clicável.
- Estética glassmorphism dark do projeto, com destaque na conversa ativa.

Adicionar hook `useChatConversations(assistant)` para CRUD (list/create/rename/delete) com realtime opcional (não obrigatório nesta fase).

### 2.5 Layout da página do assistente

Em `AssistenteGeral` (e `AssistenteVendas`, `AssistenteFundador` se ainda forem usadas como rotas separadas — verificar):

- Layout em duas colunas: sidebar (~260px) + área de chat (`AIChatPage`).
- Sidebar oculta em mobile, acessível via botão (drawer existente já tem padrão similar).
- Passar `threadId` para `AIChatPage` → `useAIChat`.

### 2.6 Comportamento de "começar do zero"

- Novas conversas começam vazias; não puxar contexto de threads anteriores (já natural com a separação por `conversation_id`).
- Dentro da conversa ativa, todo o histórico daquela thread é enviado ao modelo em cada turno (comportamento atual do `useChat` preservado).

---

## Fora de escopo

- Não mexer em tools, RLS de outras tabelas, ou UI fora do assistente.
- Não persistir título via IA (apenas heurística client-side por enquanto).
- Não implementar busca dentro do histórico nesta fase.

---

## Verificação

1. Criar duas conversas, mandar mensagens em cada, recarregar `/assistente/<id1>` e `/assistente/<id2>` — cada uma deve restaurar suas próprias mensagens, sem vazamento.
2. Renomear uma conversa → título atualizado na sidebar.
3. Excluir uma conversa → some da sidebar e suas mensagens vão junto (cascade).
4. Perguntar "move todos os deals da reciclagem pra qualificação" — agente deve listar pipelines/etapas reais e pedir seleção antes de mover.
5. Confirmar que clicar em `[Título](/crm/deal/{id})` continua navegando para o deal.

---

## Pergunta para você

Antes de implementar, confirma:

**As 3 páginas (`/assistente` Geral, mais Vendas/Fundador se ainda existirem) compartilham a mesma sidebar de histórico filtrada por `assistant`, ou você quer um histórico unificado (mistura os 3 papéis em uma lista só)?**

Recomendo: **filtrado por assistant** (cada papel tem seu próprio histórico), igual ao padrão atual de `chat_messages.assistant`. Confirmas?
