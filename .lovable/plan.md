
## Visão geral

Na rota `/crm/email` vou montar duas seções principais em abas:

1. **Caixa de entrada (Gmail)** — cada colaborador conecta o próprio Gmail via OAuth. A plataforma lê, exibe, casa automaticamente os e-mails com leads do CRM (pelo endereço do contato em `crm_persons.email`) e permite enviar/responder.
2. **Sequências de follow-up** — construtor visual onde o usuário define etapas (Dia 0, Dia 3, Dia 7…), cada uma com assunto e corpo com variáveis dinâmicas. No dia agendado, o sistema cria um **rascunho no Gmail do dono** para revisão antes do envio. Se o lead responder, a sequência é cancelada automaticamente.

---

## Seção 1 — Caixa de entrada Gmail

### Conexão
- Botão "Conectar Gmail" usa o **Lovable Connector do Gmail** (`google_mail`), modo por usuário: cada colaborador inicia o fluxo e a conexão fica vinculada ao `user_id` na nova tabela `email_accounts`.
- Estado vazio elegante quando o usuário ainda não conectou, com benefícios e CTA.
- Status da conexão (verde "Sincronizando" / amarelo "Pendente" / vermelho "Expirou — reconectar").

### Sincronização e exibição
- Edge Function `gmail-sync`: lista mensagens via gateway Gmail (`users/me/messages?q=...`), busca detalhes (`format=metadata` para a lista, `full` ao abrir), grava em `email_messages` com `thread_id`, `subject`, `from`, `to`, `snippet`, `body_html`, `received_at`, `direction` (in/out), `is_read`, `gmail_message_id`, `gmail_thread_id`.
- Casa automaticamente com `crm_deals`: ao salvar, procura o `crm_persons` cujo `email` bate com o remetente/destinatário externo e preenche `deal_id` e `person_id`.
- Botão "Sincronizar agora" + sync automática a cada 5 min (cron) por conta conectada.

### UI da caixa
Layout 3 colunas no estilo Superhuman/Gmail:
- **Esquerda**: pastas (Recebidos, Enviados, Não lidos, Vinculados a deal, Não vinculados) + busca.
- **Centro**: lista de threads (remetente, assunto, snippet, data, badge do deal se vinculado).
- **Direita**: visualização da thread aberta + cartão lateral do deal vinculado (atalho para ficha).

### Envio
- Botão "Novo e-mail" abre composer (Para / Assunto / Corpo rich-text).
- Botão "Responder" / "Responder todos" preserva `In-Reply-To` e `References`.
- Envio via Gmail API (`users/me/messages/send`) — codifica RFC 2822 em base64url.
- Grava cópia em `email_messages` como `direction=out`.

---

## Seção 2 — Construtor de sequências de follow-up

### Modelo de dados
- `email_sequences`: id, nome, descricao, ativo, trigger_type (manual | stage_enter), trigger_stage_id, owner_user_id, created_at.
- `email_sequence_steps`: id, sequence_id, ordem, dia_offset (int, dias após enrollment), subject_template, body_template.
- `email_sequence_enrollments`: id, sequence_id, deal_id, person_id, owner_user_id, started_at, current_step, status (active | completed | cancelled_replied | cancelled_manual), cancelled_reason.
- `email_sequence_drafts`: id, enrollment_id, step_id, scheduled_for, gmail_draft_id, status (pending | draft_created | sent | skipped), created_at.

### Construtor visual
- Lista de sequências (cards) + botão "Nova sequência".
- Editor com timeline vertical estilo flow:
  - Cabeçalho: nome, descrição, gatilho (Manual ou "Quando lead entra em [etapa]" — select com stages do funil).
  - Steps em cards arrastáveis: "Dia 0", "Dia 3", "Dia 7"… com botão "+ Adicionar passo".
  - Cada step: input dia_offset, input assunto, editor de corpo com **chips de variáveis** clicáveis: `{{lead_nome}}`, `{{lead_empresa}}`, `{{responsavel_nome}}`, `{{deal_titulo}}`.
  - Preview ao lado com variáveis substituídas por valores de exemplo.
- Toggle "Ativa" + botão Salvar.

### Atribuição manual
- Na ficha do deal (CrmDealDetail) adicionar dropdown "Inscrever em sequência" → cria `enrollment`.
- Página da sequência mostra lista de leads inscritos com status.

### Disparo por etapa do funil
- Trigger SQL em `crm_deals`: quando `stage_id` muda, se houver sequência ativa com `trigger_type=stage_enter` e `trigger_stage_id=NEW.stage_id` e o deal ainda não está inscrito, cria enrollment.

### Execução (cria rascunhos para aprovação)
- Edge Function `process-email-sequences` (cron diário 8h America/Sao_Paulo):
  1. Lê enrollments ativos.
  2. Para cada step cujo `started_at + dia_offset <= hoje` e ainda não processado:
     - Renderiza subject/body substituindo variáveis com dados do deal/person/owner.
     - Chama Gmail API `users/me/drafts` na conta do `owner_user_id` para criar rascunho com destinatário do `person.email`.
     - Salva `gmail_draft_id` em `email_sequence_drafts` com status `draft_created`.
     - Avança `current_step`.
  3. Notificação no painel "X rascunhos prontos para revisão" com link para Gmail.

### Cancelamento por resposta
- Durante `gmail-sync`, se chegar e-mail `direction=in` cujo `from` corresponde a `person.email` de um enrollment ativo, marca enrollment como `cancelled_replied` e ignora steps futuros.

---

## Arquivos a criar/editar

### Frontend
- `src/pages/crm/Email.tsx` — abas "Caixa de entrada" e "Sequências".
- `src/components/crm/email/InboxView.tsx` — layout 3 colunas.
- `src/components/crm/email/ThreadList.tsx`, `ThreadView.tsx`, `Composer.tsx`.
- `src/components/crm/email/GmailConnectCard.tsx` — estado conectar/conectado.
- `src/components/crm/email/SequencesList.tsx` — grid de sequências.
- `src/components/crm/email/SequenceEditor.tsx` — timeline + steps.
- `src/components/crm/email/StepCard.tsx` — editor de um passo com chips de variáveis.
- `src/components/crm/email/EnrollLeadButton.tsx` — botão na ficha do deal.
- `src/hooks/useEmail.ts` — hooks React Query (accounts, messages, send).
- `src/hooks/useEmailSequences.ts` — hooks CRUD de sequências e enrollments.
- `src/App.tsx` — rota `/crm/email` se ainda não existir, e/ou ajustar.

### Backend
- Migration criando tabelas + RLS (acesso só ao próprio `user_id` ou fundador).
- Trigger `crm_deals_stage_change_sequence_enroll`.
- Edge Functions: `gmail-sync`, `gmail-send`, `gmail-create-draft`, `process-email-sequences`.
- Cron pg_cron: chamada de `gmail-sync` a cada 5 min e `process-email-sequences` diário 11:00 UTC.

### Conector
- Linkar conector `google_mail` (Gmail) via `standard_connectors--connect` antes da implementação dos Edge Functions.

---

## Detalhes técnicos

- **Variáveis dinâmicas**: renderizadas server-side dentro do Edge Function antes de criar o draft, com `String.prototype.replaceAll` simples sobre o template. Sanitização: variáveis só lêem campos do deal/person/profile (whitelist).
- **Idempotência da sequência**: chave única `(enrollment_id, step_id)` em `email_sequence_drafts` evita rascunho duplicado se o cron rodar duas vezes.
- **RLS**: 
  - `email_accounts`, `email_messages`, `email_sequence_enrollments`, `email_sequence_drafts`: visíveis ao próprio `owner_user_id` + `has_role(uid,'fundador')`.
  - `email_sequences`, `email_sequence_steps`: leitura para todos autenticados, escrita só fundador (ou criador).
- **Token Gmail**: gerenciado pelo gateway do Lovable — não armazenamos refresh_token nós mesmos.
- **Escopos Gmail requeridos**: `gmail.readonly` (sync), `gmail.send` (envio direto na Inbox), `gmail.compose` (criar rascunhos).
- **Estética**: dark glassmorphism existente, emerald #00C896 para badges positivas, lista de threads com hover sutil; chips de variáveis com cor accent.

---

## Fora de escopo desta entrega

- Anexos no envio direto (apenas link possível) — Gmail API suporta, mas adiciona complexidade; podemos adicionar depois se quiser.
- Tracking de abertura/cliques (pixels) — fora do escopo inicial.
- Templates de e-mail reutilizáveis fora de sequências.

Posso ajustar qualquer ponto antes de implementar.
