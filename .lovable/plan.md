## Visão geral

Integrar a Evolution API (`https://evolution.palaciosnet.site/`) para que cada colaborador conecte seu próprio WhatsApp escaneando um QR code. Funcionalidades: conectar/desconectar, enviar mensagens manuais (a partir de leads/deals), programar mensagens, receber mensagens via webhook e disparar mensagens automáticas em fluxos.

## 1. Banco de dados (migration)

Tabelas novas no schema `public`:

- **`whatsapp_instances`** — uma por colaborador
  - `user_id` (FK auth.users, unique), `instance_name` (único, ex: `palacios_<slug>`), `status` (`disconnected` | `connecting` | `connected` | `error`), `phone_number`, `profile_name`, `qr_code` (text base64), `last_connected_at`, timestamps
- **`whatsapp_messages`** — histórico (enviadas + recebidas)
  - `instance_id`, `direction` (`in`|`out`), `remote_jid`, `message_id` (evolution), `content`, `media_url`, `media_type`, `status` (`pending`|`sent`|`delivered`|`read`|`failed`), `deal_id` (FK opcional), `person_id` (FK opcional), `sent_at`, `received_at`, `raw` (jsonb)
- **`whatsapp_scheduled_messages`** — fila de programadas
  - `instance_id`, `to_number`, `content`, `media_url`, `scheduled_for` (timestamptz), `status` (`pending`|`sent`|`failed`|`cancelled`), `deal_id`, `error_message`, `sent_message_id`
- **`whatsapp_webhook_events`** — log bruto p/ debug (TTL manual)

Tudo com RLS:
- Colaborador vê/edita só onde `user_id = auth.uid()` (via join na instance).
- `fundador` (via `has_role`) vê todas.
- GRANTs para `authenticated` e `service_role`. Sem grant para `anon`.

## 2. Secrets

Adicionar via tool de secrets:
- `EVOLUTION_API_URL` = `https://evolution.palaciosnet.site`
- `EVOLUTION_API_KEY` = AUTHENTICATION_API_KEY global (você cola no formulário seguro)
- `EVOLUTION_WEBHOOK_TOKEN` = token aleatório que vou gerar — Evolution envia no header e nós validamos

## 3. Edge Functions

Todas as funções autenticadas validam JWT via `getClaims` (exceto webhook).

- **`evolution-instance`** — gerencia ciclo de vida
  - `POST /create` → cria instância na Evolution + linha em `whatsapp_instances` + configura webhook apontando para nossa edge `evolution-webhook` com o token
  - `GET /qr` → busca QR atualizado (ou conecta)
  - `POST /disconnect` → logout
  - `DELETE /delete` → remove instância
  - `GET /status` → estado atual + número conectado
- **`evolution-send`** — envia mensagem manual
  - Body: `{ instance_id, to, content, media_url? }`. Valida que o `user_id` é dono da instância (ou fundador). Grava em `whatsapp_messages`.
- **`evolution-webhook`** (`verify_jwt = false`, em `supabase/config.toml`)
  - Valida header `X-Webhook-Token` contra `EVOLUTION_WEBHOOK_TOKEN`
  - Trata eventos: `qrcode.updated`, `connection.update`, `messages.upsert`, `send.message` — atualiza `whatsapp_instances` e insere em `whatsapp_messages`. Tenta vincular ao `deal`/`person` pelo telefone.
- **`evolution-scheduler`** — roda via `pg_cron` a cada minuto
  - Pega `whatsapp_scheduled_messages` com `scheduled_for <= now()` e `status = pending`, dispara via Evolution, atualiza status.

## 4. Frontend

- **Nova página `/whatsapp`** (rota no `App.tsx`, lazy)
  - Para colaborador: card único com status da sua instância, QR (polling 3s enquanto `connecting`), botão Conectar/Desconectar, número conectado, botão "Programar mensagem", lista das últimas mensagens.
  - Para `fundador`: tabs "Minha conta" + "Todas as instâncias" (tabela com status, ações por linha).
- **Link no sidebar** (`AppSidebar.tsx`) — ícone MessageCircle, label "WhatsApp".
- **Hook `useWhatsApp.ts`** — wrappers para invocar as edge functions e queries Tanstack para instâncias/mensagens/agendamentos com realtime subscription.
- **Componente `<WhatsAppSendButton>`** — botão reaproveitável em `CrmDealDetail` (lead) que abre modal: textarea, opção "enviar agora" ou "programar para".
- **`WhatsAppHistoryTab`** dentro do detalhe do deal mostrando troca de mensagens vinculadas.

## 5. Disparos automáticos (fluxos)

Adicionar novo tipo de ação no `FlowEditor` existente: **"Enviar WhatsApp"** — node que enfileira em `whatsapp_scheduled_messages` (ou envia imediato) usando a instância do owner do deal. Reaproveita `evolution-send`.

## 6. Realtime

`ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_instances, whatsapp_messages;` para o QR e o status atualizarem ao vivo sem polling pesado.

## Detalhes técnicos

```text
[Colaborador] --clica Conectar--> [/whatsapp UI]
                                      |
                                      v
                              evolution-instance/create
                                      |
                  +-------------------+-------------------+
                  v                                       v
            Evolution API                          Supabase DB
        (cria instância +                       (whatsapp_instances)
         configura webhook)
                                      |
[Evolution] --QR/eventos--> evolution-webhook --insert--> DB --realtime--> UI
```

Webhook URL configurada na Evolution: `https://zluhkwrcoupmqdhnjjew.supabase.co/functions/v1/evolution-webhook` com header `X-Webhook-Token: <EVOLUTION_WEBHOOK_TOKEN>`.

## Ordem de execução

1. Migration (tabelas + RLS + grants + realtime)
2. Pedir secrets (`EVOLUTION_API_KEY`, gerar `EVOLUTION_WEBHOOK_TOKEN`)
3. Edge functions + entradas em `config.toml` (webhook + scheduler com `verify_jwt = false`)
4. Cron job para `evolution-scheduler`
5. Hook + página `/whatsapp` + sidebar
6. Modal de envio no detalhe do deal
7. Node "Enviar WhatsApp" no FlowEditor

## Fora de escopo desta v1

- Templates/listas reutilizáveis (pode vir depois)
- Métricas/dashboard de WhatsApp
- Grupos/broadcasts
