# Integração Resend — Envio em massa + tracking

## O que você vai ter ao final

- **Envio em massa** via Resend (3.000 emails/mês grátis) com domínio `palacios3dstudio.com` verificado (SPF/DKIM/DMARC) — não cai em spam
- **Open tracking + click tracking** automáticos por email enviado
- **Nova aba "Campanhas" no CRM**: selecionar leads → escolher template → disparar em lote
- **Eventos visíveis no card do deal**: "📨 Enviado · 👁 Aberto 3x · 🔗 Clicou no link" em tempo real
- **Sequências existentes** (`email_sequences`) ganham opção de disparar via Resend em vez de Gmail draft

## Pré-requisitos (você precisa fazer)

1. Criar conta grátis em **resend.com** (só email, 1 min)
2. Ter acesso ao DNS do `palacios3dstudio.com` (Registro.br, Cloudflare, GoDaddy — onde estiver) para colar 3 registros TXT
3. Conectar o Resend via connector do Lovable (eu abro o popup, você escolhe a conta)

## Etapas de implementação

### 1. Conectar Resend e verificar domínio
- Linkar connector `resend` ao projeto (cria `RESEND_API_KEY` automaticamente)
- Te passar os registros DNS para colar no provedor do domínio
- Aguardar verificação (~10 min após DNS propagar)

### 2. Infra de banco (migration)
Criar tabelas:
- **`email_campaigns`**: id, nome, subject, body_html, from_email, criado_por, status (draft/sending/sent), total_enviados, total_abertos, total_clicados, created_at
- **`email_campaign_recipients`**: id, campaign_id, deal_id, person_id, recipient_email, resend_message_id, status (queued/sent/delivered/opened/clicked/bounced/failed), sent_at, first_opened_at, open_count, first_clicked_at, click_count, bounce_reason
- **`email_templates`**: id, nome, subject, body_html, variables (jsonb), created_at — para reaproveitar templates

RLS: fundador vê tudo, vendedor vê só campanhas que criou.

### 3. Edge Functions
- **`resend-send-campaign`**: recebe `campaign_id`, busca destinatários, dispara em lote (batch de 100, com rate limit), grava `resend_message_id` por destinatário
- **`resend-webhook`**: endpoint público que recebe eventos do Resend (`email.sent`, `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`) e atualiza `email_campaign_recipients` em tempo real
- **`resend-send-single`**: envio 1-a-1 a partir do card do deal (substitui/complementa o draft do Gmail)

### 4. UI — Nova aba "Campanhas" em `/crm`
- Lista de campanhas com métricas (enviados, taxa de abertura %, taxa de clique %)
- Botão **"Nova Campanha"**:
  - Seleção de leads (filtros por etapa, owner, tag)
  - Escolha de template (ou compor do zero, editor simples HTML/markdown)
  - Variáveis dinâmicas: `{{nome}}`, `{{empresa}}`, `{{cargo}}`
  - Preview antes de disparar
  - Botão "Enviar agora" ou "Agendar"
- Detalhe da campanha: tabela com cada destinatário e seu status atualizado em tempo real (Supabase Realtime)

### 5. UI — Card do deal (`CrmDealDetail.tsx`)
- Nova seção "Emails enviados" no histórico, em **azul claro** (distinto das notas amarelas):
  - "Email enviado: [assunto] · há 2h"
  - Badge ao lado: "👁 Aberto 3x · última às 14:32"
  - Badge: "🔗 Clicou no link às 14:35"
- Botão "Enviar email" abre composer rápido usando Resend

### 6. Configuração webhook no Resend
- Após deploy, copiar URL do `resend-webhook` e colar no painel do Resend (Webhooks → Add endpoint)
- Eu te guio passo a passo

## Detalhes técnicos

- **Gateway**: chamadas para `https://connector-gateway.lovable.dev/resend/emails` com header `X-Connection-Api-Key`
- **From**: `aline@palacios3dstudio.com` ou `contato@palacios3dstudio.com` (configurável)
- **Tracking pixel**: Resend injeta automaticamente, sem código adicional
- **Realtime**: `ALTER PUBLICATION supabase_realtime ADD TABLE email_campaign_recipients` para atualizar UI sem refresh
- **Rate limit**: Resend free permite 2 req/s — batch de 100 com `await sleep(500)` entre lotes
- **Gmail permanece**: continua para conversas 1-a-1 reais (responder leads que responderam), Resend só para outbound em massa

## O que NÃO está no escopo (posso fazer depois)

- A/B testing de subject lines
- Sequências automáticas via Resend (hoje as sequências geram drafts no Gmail — manter assim por enquanto)
- Importação de listas externas (CSV) — só envio para leads já no CRM
- Editor visual drag-and-drop de email (HTML simples no MVP)

---

**Quando você aprovar este plano:**
1. Confirma seu domínio (`palacios3dstudio.com` ou outro?)
2. Eu abro o popup de connector do Resend
3. Eu crio a infra (migration + edge functions + UI) e te passo os registros DNS para colar
