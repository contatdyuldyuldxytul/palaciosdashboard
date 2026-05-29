# Upgrade da aba Campanhas

Vou transformar o modal atual (simples textarea HTML + lista crua de leads) em um construtor de campanhas completo, com editor visual, biblioteca de templates, filtros e anexos.

## 1. Editor visual de email (rich-text)

Substituir a `Textarea` HTML por um editor **Tiptap** (leve, React-native, ~50kb gz) com toolbar fixa:

- **Formatação**: negrito, itálico, sublinhado, riscado, cabeçalhos (H1/H2/H3), listas (•, 1.), citação, código
- **Links**: inserir/editar URL com prompt
- **Imagens inline**: upload para Supabase Storage → cola URL pública no email
- **Alinhamento**: esquerda, centro, direita
- **Cor de texto e destaque** (paleta limitada para não quebrar deliverability)
- **Variáveis dinâmicas**: botão "Inserir variável" → menu com `{{nome}}`, `{{primeiro_nome}}`, `{{empresa}}`, `{{cargo}}`, `{{email}}` (chips visuais que viram texto no envio)
- **Assinatura**: dropdown "Inserir assinatura" puxa assinaturas salvas (ver abaixo) e cola no final
- **Preview ao vivo** lado-a-lado (toggle) renderizando com dados do primeiro destinatário selecionado

## 2. Biblioteca de templates

Aba **"Templates"** dentro de Campanhas (tabs internas: Campanhas | Templates | Assinaturas):

- Grid de cards mostrando nome, assunto, preview e categoria
- **Criar** template (mesmo editor da campanha) com nome, categoria (Outbound, Follow-up, Nutrição, Reativação), assunto e corpo
- **Editar / duplicar / arquivar / deletar**
- **Usar template**: ao criar campanha, dropdown "Carregar template" preenche assunto + corpo
- **Salvar como template**: botão dentro do modal de nova campanha
- Contador de uso ("usado 12x") por template
- Tabela nova: `email_templates` já existe — só adicionar colunas `categoria`, `arquivado`, `vezes_usado`, `thumbnail_html`

## 3. Assinaturas salvas

Sub-aba **Assinaturas** (tabela nova `email_signatures`):

- CRUD simples: nome ("Aline padrão", "Milena breve"), corpo HTML (com foto, telefone, link de agenda)
- Marcar uma como **padrão** (auto-inserida em novas campanhas)
- Reaproveitada também no envio 1-a-1 do `CrmDealDetail`

## 4. Filtros avançados de destinatários

Substituir o `<select>` único de pipeline por um painel de filtros combinados:

- **Pipeline** (múltipla escolha)
- **Etapa** (multi-select baseado no pipeline escolhido)
- **Status do deal**: aberto, ganho, perdido
- **Responsável** (owner)
- **Tag / origem** (Instagram, Pipedrive, Hunter, CSV…)
- **Tem email válido** (default: sim — esconde quem não pode receber)
- **Já recebeu campanha nos últimos N dias** (anti-spam interno; default: 7 dias de cooldown)
- **Não está em lista de supressão** (bounces + descadastros — sempre on)
- **Busca livre** por nome/empresa/email
- **Contador dinâmico**: "247 leads correspondem · 12 excluídos por cooldown · 3 em supressão"
- Botão **Salvar segmento** → vira lista nomeada reutilizável (tabela `email_audience_segments`)

## 5. Anexos

- Botão "Anexar arquivo" no editor → upload para bucket `email-attachments` (novo, privado)
- Limite: 10 MB por arquivo, 20 MB total por email (limites do Resend)
- Lista visual dos anexos com nome + tamanho + remover
- Edge function `resend-send-campaign` passa anexos como base64 no payload do Resend

## 6. Outras funcionalidades úteis

**Agendamento**
- "Enviar agora" ou "Agendar para…" (date + hora)
- Coluna `scheduled_for` na `email_campaigns`; cron a cada 5 min dispara campanhas vencidas

**Teste antes de disparar**
- Botão "Enviar teste para mim" envia 1 email com merge real (primeira pessoa da lista) só para o usuário logado — pega problemas de formatação antes do envio em massa

**Descadastro automático (LGPD)**
- Rodapé com link `{{unsubscribe_url}}` injetado automaticamente
- Edge function pública `email-unsubscribe` que marca email na tabela `email_suppressions` (já parte do plano de filtros)
- Sem isso o Resend pode pausar a conta por reclamações

**Detalhe da campanha** (clicar no card)
- Sheet/drawer lateral com:
  - Métricas grandes em tempo real
  - Tabela de cada destinatário: status, hora de abertura, número de aberturas, cliques (com URL clicada)
  - Botão "Reenviar para quem não abriu" → cria campanha derivada com lista filtrada
  - Export CSV dos resultados

**Duplicar campanha**
- Botão "Duplicar" nos cards → abre modal pré-preenchido (rápido para A/B ou reenviar com ajuste)

**Indicador de cota Resend**
- Topo da aba mostra "1.247 / 3.000 emails este mês" (limite do plano grátis); avisa em laranja > 80%

## Mudanças técnicas

```text
DB (migrations)
├── email_templates: + categoria, arquivado, vezes_usado, thumbnail_html
├── email_signatures (nova): nome, corpo_html, is_default, owner
├── email_audience_segments (nova): nome, filtros (jsonb), created_by
├── email_suppressions (nova): email, motivo (bounce/unsubscribe/manual), created_at
├── email_campaigns: + scheduled_for, attachments (jsonb), segment_id, parent_campaign_id, test_sent_to
└── email_campaign_recipients: + last_opened_at, click_count, clicked_urls (jsonb)

Storage
├── bucket "email-attachments" (privado, RLS por owner)
└── bucket "email-inline-images" (público, para <img> no corpo)

Edge functions
├── resend-send-campaign: suportar anexos + injetar unsubscribe footer + respeitar supressão
├── email-unsubscribe (nova, pública): GET ?token=xxx → marca supressão e mostra página de confirmação
├── resend-webhook: registrar bounces na email_suppressions automaticamente
└── campaign-scheduler (nova, cron 5min): dispara campanhas com scheduled_for vencido

Frontend
├── npm: @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image @tiptap/extension-underline @tiptap/extension-text-align @tiptap/extension-color
├── src/components/crm/email/RichEditor.tsx (reutilizável aqui + em CrmDealDetail)
├── src/components/crm/campanhas/
│   ├── CampanhasView.tsx (refatorado: 3 tabs internas)
│   ├── NewCampaignModal.tsx (editor + filtros + anexos + agendamento + teste)
│   ├── TemplatesTab.tsx
│   ├── SignaturesTab.tsx
│   ├── RecipientFilters.tsx
│   ├── CampaignDetailSheet.tsx (drawer com tabela de destinatários)
│   └── QuotaIndicator.tsx
└── src/hooks/useEmailTemplates.ts, useEmailSignatures.ts, useEmailSegments.ts
```

## O que NÃO faço agora (posso fazer depois se quiser)

- A/B testing automático de subject lines
- Editor drag-and-drop estilo Mailchimp (blocos visuais) — fica no rich-text Tiptap por enquanto
- Importação de listas CSV externas (só leads que já estão no CRM)
- Cliques em links individuais com heatmap

---

**Ao aprovar**, eu executo na ordem: migrations → bucket de anexos → edge functions atualizadas → editor Tiptap → filtros → templates/assinaturas → detalhe da campanha → agendamento e teste.
