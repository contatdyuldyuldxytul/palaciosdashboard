
# WhatsApp 2.0 — Inbox + Disparos (estilo Umbler)

Vou reconstruir a aba `/whatsapp` em uma experiência completa de vendas com dois módulos principais e suporte transversal de templates e contatos do CRM.

## Estrutura da nova página

```text
/whatsapp
├── 💬 Conversas     (inbox em tempo real)
├── 📢 Disparos      (campanhas em massa com cadência)
├── ✨ Templates     (respostas rápidas com variáveis)
└── ⚙️ Conexão       (QR code / status — card atual, enxuto)
```

Tabs no topo, mantendo o visual glass dark. Fundador vê seletor de "Conta" para alternar entre instâncias dos colaboradores.

---

## 1. Inbox de Conversas (estilo Umbler)

Layout em 3 colunas (responsivo: vira drawer no mobile):

```text
┌──────────────┬──────────────────────┬────────────────┐
│ Conversas    │ Chat                 │ Contexto       │
│ [busca]      │ ┌──────────────────┐ │ Nome           │
│ ● Não lidas  │ │ msgs in/out      │ │ Telefone       │
│ ─────────    │ │ bolhas estilo WA │ │ Vinculado a:   │
│ • João Silva │ │                  │ │  → Deal "X"    │
│   "Pode ser..│ │                  │ │  [Vincular]    │
│   há 5 min   │ │                  │ │ Templates ▾    │
│ • Maria      │ ├──────────────────┤ │ Notas internas │
│ • +55...     │ │ [composer + ⚡]   │ │                │
└──────────────┴──────────────────────┴────────────────┘
```

**Recursos:**
- Lista de conversas agrupada por `remote_jid`, com último preview, hora, contador de não lidas e badge se vinculado a deal/lead.
- Filtros: Todas / Não lidas / Vinculadas a CRM / Sem deal.
- Busca por nome, telefone ou conteúdo.
- Chat com bolhas (in/out), realtime via Supabase Realtime já configurado em `whatsapp_messages`.
- Composer com botão ⚡ para inserir **template rápido** (com substituição de `{{nome}}`, `{{empresa}}`).
- Painel direito: vincular conversa a lead/deal (busca em `crm_persons` por telefone/nome) e marcar como lido.
- Marcar lido = adicionar coluna `is_read` em `whatsapp_messages` e atualizar via mutation.

---

## 2. Disparos em massa

Fluxo em 4 passos dentro de um wizard:

**Passo 1 — Origem dos contatos**
- Aba "Do CRM": busca/filtra `crm_persons` com checkboxes (filtrar por pipeline/stage, dono, tag).
- Aba "Importar/Colar": textarea para colar números (um por linha) ou upload CSV simples (`nome,telefone`).
- Mostra lista consolidada com chips removíveis e contador "X contatos selecionados".

**Passo 2 — Mensagem**
- Editor com variáveis (`{{nome}}`, `{{primeiro_nome}}`, `{{empresa}}`).
- Botão "Carregar template" da biblioteca.
- Preview ao vivo com substituição usando o 1º contato.

**Passo 3 — Cadência anti-bloqueio**
- Intervalo aleatório entre envios: padrão 30–60s, ajustável (slider 15–120s).
- Janela horária permitida (ex: 09:00–18:00, dias úteis) — fora da janela, fila pausa.
- Limite diário por instância (padrão 80 msgs/dia).
- Estimativa: "≈ X mensagens, terminará em ~Y horas".

**Passo 4 — Revisar & disparar**
- Resumo + botão "Iniciar campanha".
- Cria 1 linha em `whatsapp_campaigns` + N em `whatsapp_scheduled_messages` com `scheduled_for` espaçado aleatoriamente respeitando janela e limite diário.

**Tela de campanha em andamento:**
- Lista de campanhas com progresso (enviadas / pendentes / falhadas), botão Pausar/Retomar/Cancelar.
- Drill-down mostra cada destinatário, status, hora, erro.

A função `evolution-scheduler` (já existente) continua processando `whatsapp_scheduled_messages` pendentes — só precisa respeitar `paused` em `whatsapp_campaigns`.

---

## 3. Templates rápidos

CRUD simples (nome, conteúdo, variáveis detectadas automaticamente). Tabela `whatsapp_templates` por usuário. Usados no inbox (botão ⚡) e no wizard de disparo.

---

## 4. Conexão

Mantém o `InstanceCard` atual (QR, status, desconectar) reposicionado na aba "Conexão" — enxuto.

---

## Mudanças técnicas

**Banco (1 migration):**
- `whatsapp_messages`: + `is_read boolean default false`.
- `whatsapp_campaigns` (nova): `id, instance_id, created_by, nome, message_template, total, sent, failed, status (draft|running|paused|completed|cancelled), settings jsonb (interval_min, interval_max, daily_limit, window_start, window_end, weekdays), created_at, updated_at`.
- `whatsapp_scheduled_messages`: + `campaign_id uuid`, + `variables jsonb` (para render por destinatário).
- `whatsapp_templates` (nova): `id, owner_user_id, nome, conteudo, created_at, updated_at` — RLS: dono + fundador.
- GRANTs e RLS em todas.
- Habilitar realtime na nova `whatsapp_campaigns`.

**Edge functions:**
- `evolution-scheduler`: respeitar `whatsapp_campaigns.status = 'paused'/'cancelled'`, renderizar `content` aplicando `variables`, atualizar contadores da campanha.
- `evolution-send`: aceitar `variables` opcionais para render server-side.
- Nova `whatsapp-campaign-create`: recebe `{ instance_id, nome, template, recipients[], settings }`, gera todas as `scheduled_messages` com `scheduled_for` calculado (cadência aleatória + janela).

**Frontend (novos arquivos):**
- `src/pages/WhatsApp.tsx` — reescrito com tabs.
- `src/components/whatsapp/Inbox.tsx`
- `src/components/whatsapp/ConversationList.tsx`
- `src/components/whatsapp/ChatPanel.tsx`
- `src/components/whatsapp/ContextPanel.tsx`
- `src/components/whatsapp/CampaignsView.tsx`
- `src/components/whatsapp/CampaignWizard.tsx` (4 passos)
- `src/components/whatsapp/TemplatesView.tsx`
- `src/components/whatsapp/ConnectionTab.tsx` (extrai InstanceCard atual)
- `src/hooks/useWhatsApp.ts` — adiciona hooks para conversations (group by jid), campaigns, templates, mark-as-read.

---

## Fora de escopo (próxima fase, posso adicionar depois)
- Envio/recebimento de mídia (áudio/imagem/PDF) — fica para v2.
- Atribuição de conversa entre vendedores.
- Segmentos salvos avançados.
