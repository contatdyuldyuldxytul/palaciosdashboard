## Objetivo

Migrar **100%** do Pipedrive pro Lovable Cloud rodando uma única edge function pelo backend, sem nova UI. A função já existente `import-pipedrive-once` é idempotente (upsert por `pipedrive_id`), então rodar de novo só atualiza o que mudou — segura pra repetir quantas vezes precisar.

## O que já é importado hoje

A função `supabase/functions/import-pipedrive-once` já cobre:
- Pipelines → `crm_pipelines`
- Stages → `crm_stages` (incl. `pipedrive_stage_id`)
- Organizations → `crm_organizations`
- Persons → `crm_persons`
- Deals abertos/won/lost → `crm_deals`
- Activities (call, email, meeting, task, deadline) → `crm_activities`
- Notes → `crm_notes`

## O que falta (escopo desta migração)

Com base na sua resposta, adiciono três blocos:

### 1. Emails sincronizados no Pipedrive
- Endpoint: `GET /mailbox/mailMessages` (paginado) + `GET /mailbox/mailThreads`
- Mapeio cada email pra `email_messages` (tabela já existe), vinculando `deal_id` e `person_id` via `pipedrive_id`
- Campos: `gmail_message_id` (uso o ID do Pipedrive prefixado com `pd_` pra não colidir com Gmail), `direction` (sent/received), `subject`, `from_email`, `to_emails`, `body_html`, `received_at`, `raw_payload` (JSON original)
- Dedup: chave única `gmail_message_id` (já é unique na tabela; se não for, adiciono índice único parcial)

### 2. Deals deletados
- Endpoint: `GET /deals?status=deleted` (paginado)
- Importo no `crm_deals` com `status='lost'` + `motivo_perda='[deletado no Pipedrive]'` + flag em coluna nova `deleted_in_pipedrive boolean default false`
- Migration mínima: adiciona essa coluna em `crm_deals`

### 3. Histórico de mudanças dos deals (changelog)
- Endpoint por deal: `GET /deals/{id}/flow` (devolve change log + activities + notes — uso só o `dealChange`)
- Mapeio cada mudança pra `crm_deal_history` (tabela já existe) com `evento='pipedrive_change'` e `payload` = `{field, old_value, new_value, time, user}`
- Dedup: índice único `(deal_id, evento, payload->>'time', payload->>'field')` pra não duplicar em re-runs
- **Custo de API**: 1 request por deal. Pra ~N deals isso é O(N) calls. Vou rodar em lotes de 10 paralelos com backoff em 429 (limite diário do Pipedrive)

## Mudanças técnicas

### Migration (1 arquivo)
```
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS deleted_in_pipedrive boolean DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS email_messages_gmail_msg_uniq ON email_messages(gmail_message_id);
CREATE UNIQUE INDEX IF NOT EXISTS crm_deal_history_pd_change_uniq
  ON crm_deal_history(deal_id, evento, (payload->>'time'), (payload->>'field'))
  WHERE evento = 'pipedrive_change';
```

### Edge function `import-pipedrive-once` — estender com 3 blocos
- Bloco 8: Mail messages
- Bloco 9: Deleted deals
- Bloco 10: Deal flow / change log (paralelizado em batches de 10, backoff em 429)
- Retorna summary expandido: `{ mail_messages, deleted_deals, history_entries }`

### Tratamento de 429 (limite diário do Pipedrive)
- Se receber 429, aguarda 60s e tenta de novo (máx 3x); se persistir, marca o bloco como "parcial" no summary e segue
- Você consegue rerodar amanhã pra terminar (idempotência garante que não duplica)

## Execução

Depois que você aprovar este plano:
1. Aplico a migration (você aprova no popup)
2. Edito a edge function adicionando os 3 blocos
3. Chamo `supabase--curl_edge_functions` em `/import-pipedrive-once` e te entrego o summary no chat com os contadores: pipelines, stages, orgs, persons, deals (incl. deletados), activities, notes, emails, history entries
4. Se algo retornar parcial por 429, te aviso e você decide quando rerodar

## Fora de escopo (você marcou só email + deletados + histórico)

- Arquivos/anexos dos deals (não foi pedido — posso adicionar depois)
- Custom fields (não foi pedido — posso adicionar depois mapeando pra coluna `custom_fields jsonb`)
- Webhooks bidirecionais (já existe stub em `n8n-dispatch`, fora deste escopo)
- UI de progresso/migração (você escolheu rodar sem UI)
