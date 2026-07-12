
## 1. Check-up da plataforma (respostas rápidas)

**WhatsApp — disparos**
Infraestrutura pronta: Evolution API conectada (`EVOLUTION_API_KEY`/`EVOLUTION_API_URL` configurados), tabelas `whatsapp_instances`, `whatsapp_campaigns`, `whatsapp_scheduled_messages` e `whatsapp_messages` populadas, edge functions `evolution-send`, `evolution-scheduler` (rodando a cada minuto — logs mostram boots normais) e `whatsapp-campaign-create` deployadas. **Funciona desde que a instância esteja conectada (QR pareado na aba Conexão).** Recomendo checar a aba Conexão do WhatsApp antes de disparar. Risco: se a instância cair, mensagens ficam presas em `scheduled` — hoje não há alerta visual disso.

**E-mail — campanhas**
Provider: Resend (connector conectado, `RESEND_API_KEY` presente) via `resend-send-campaign` / `resend-send-single`. Webhook `resend-webhook` grava bounces/complaints em `email_suppressions` e o remetente respeita `email_suppressions` antes de enviar. Domínio de envio precisa estar verificado no Resend — sem domínio próprio verificado, cai em spam ou é bloqueado. **Riscos de spam hoje:**
- Não há rate-limit próprio; disparo em massa vai na velocidade do Resend.
- Não há aquecimento (warm-up) de domínio configurado.
- Unsubscribe existe (`email-unsubscribe` + tokens), mas o link precisa estar no template.

**Pipedrive — geração de leads**
Sync roda ok (`sync-pipedrive` retornou 200 com pipelines). `import-pipedrive-once` foi refatorada pra rodar em background (evita CPU limit). Seleção de leads na aba "Geração de Leads" grava em `leads_raw`/`leads_qualified` via `milena-leads-sheets` — **atenção: os logs mostram erro `sb.auth.getClaims is not a function` nessa função**, o que quebra a autenticação hoje.

**Aba Deals**
CRUD, kanban, lista, KPIs, importação (CSV/Sheets/Pipedrive) e drag-and-drop entre stages funcionam. Limitação atual: **busca só filtra o pipeline selecionado** (query traz só 500 deals de 1 pipeline) — é isso que você pediu pra corrigir.

---

## 2. Mudanças pedidas (aba Deals)

### 2.1 Remover a sub-aba "Automações N8N"
Em `src/pages/Crm.tsx`:
- Remover botão da sub-aba `fluxos` (linhas 201-208).
- Remover branch `tab === "fluxos" ? <N8nAutomations />` (linha 263-264).
- Remover imports `N8nAutomations`, `Workflow`.
- Tipo `tab` passa a ser `"deals" | "campanhas"`.
- **Não deletar** o arquivo `N8nAutomations.tsx` nem as tabelas n8n — ainda são usados em `src/pages/crm/Projects.tsx` (aba Projects/Automações N8N continua existindo lá).

### 2.2 Mover a busca "para cima"
Hoje a busca já está no header (linhas 149-160), à direita, junto com Importar/Novo Deal. Vou movê-la para **uma linha própria acima do header de sub-tabs**, ocupando largura maior (full width em mobile, `max-w-2xl` em desktop), com label "Buscar em todos os deals" para deixar claro que é global.

### 2.3 Busca global (todos os pipelines / contatos)
Trocar a fonte da busca de `deals` (do pipeline atual) para uma consulta global quando há texto digitado:

- Criar hook `useCrmDealsSearch(query: string)` em `src/hooks/useCrm.ts` que, quando `query.length >= 2`:
  - Faz `supabase.from("crm_deals").select("*, organization:crm_organizations(*), person:crm_persons(*)").or("titulo.ilike.%q%")` **sem** filtro por `pipeline_id`, limit 200.
  - Em paralelo, busca `crm_persons` e `crm_organizations` que dão match em nome/email/telefone e depois busca os `crm_deals` desses `person_id`/`organization_id` (une resultados, dedup por `id`).
  - Retorna também o `pipeline` de cada deal (join `crm_pipelines(nome)`) pra mostrar de qual pipeline veio.
- Em `Crm.tsx`: quando `search.trim().length >= 2`, renderiza uma **lista de resultados globais** (usando `DealListView` ou uma variação simples) no lugar do kanban/lista do pipeline, com badge do pipeline em cada linha e clique abrindo o deal (`/crm/deals/:id`). Quando busca está vazia, volta ao comportamento atual (kanban/lista do pipeline selecionado).

### 2.4 Toggle Kanban/Lista
Fica escondido enquanto houver busca ativa (não faz sentido kanban em resultado multi-pipeline).

---

## 3. Fora de escopo (posso fazer em seguida se quiser)
- Corrigir `sb.auth.getClaims` na `milena-leads-sheets` (bug real que está nos logs).
- Adicionar alerta visual quando instância WhatsApp cair.
- Configurar rate-limit / warm-up de e-mail.

## Detalhes técnicos
- Arquivos alterados: `src/pages/Crm.tsx`, `src/hooks/useCrm.ts`.
- Sem migração de banco. Sem mudança de RLS (deals já têm policies).
- N8N (tabelas, edge function `n8n-proxy`, componente) permanece intacto — só sai da navegação da aba Deals; continua acessível em Projects.
