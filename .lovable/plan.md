## CRM › Subaba "Projects"

Adiciona 3 sub-abas dentro de `/crm/projects`: **Kanban**, **Fluxos**, **Admin**.

---

### 1. Kanban de Projects (clientes)

- Tela igual ao Kanban de deals (drag & drop, drop-bar inferior), mas operando sobre **clientes/projetos**.
- **Pipelines customizáveis** com estágios próprios (ex.: Onboarding → Briefing → Produção → Revisão → Entregue → Pós-venda) — edição como o `PipelineEditorScreen` atual.
- **Fonte dupla de clientes**:
  - Importa clientes existentes de `clientes_ativos` (botão "Adicionar de clientes existentes").
  - Auto-cria projeto quando um `crm_deals` muda para `status = 'won'` (trigger SQL): copia organização/pessoa/valor e coloca no primeiro stage do pipeline default.
- Card mostra: cliente, projeto, valor, progresso (%), dias no stage, responsável.
- Clique no card → modal de detalhes do projeto (reaproveita layout do `CrmDealDetail`, com aba Checklist 16-passos já existente).

### 2. Fluxos do Processo (Node Editor)

- Editor visual estilo n8n/Zapier usando **React Flow** (`@xyflow/react`).
- Tipos de nodes:
  - **Trigger**: "Cliente entra no stage X", "Projeto criado", "Manual"
  - **Ação Email** (via Resend connector)
  - **Ação WhatsApp** (via Twilio connector — WhatsApp Business)
  - **Delay** (esperar N horas/dias)
  - **Condição** (if/else baseado em campo do projeto)
  - **Atualizar projeto** (mover stage, marcar checklist)
- Lista de fluxos + botão "Novo fluxo" → canvas com paleta lateral, drag de nodes, conexão por arestas, painel de configuração à direita.
- Cada fluxo persiste como JSON (`nodes`, `edges`, `config`) e pode estar `ativo`/`pausado`.
- **Execução real**: edge function `flow-executor` consome triggers (via trigger Postgres no `project_deals`) e processa nodes sequencialmente, registrando cada step em `flow_runs` / `flow_run_steps`.
- Email: connector Resend já disponível no padrão Lovable. WhatsApp: precisa conectar **Twilio** (vou pedir confirmação para conectar quando chegarmos nessa etapa).

### 3. Painel Admin

- Placeholder **"Em breve"** com card centralizado (sem funcionalidade agora).

---

## Detalhes técnicos

**Migrations (novas tabelas):**
```text
project_pipelines (id, nome, ordem, ativo, is_default)
project_stages    (id, pipeline_id, nome, ordem, cor, is_final)
project_deals     (id, pipeline_id, stage_id, cliente_ativo_id, crm_deal_id,
                   titulo, valor, progresso, responsavel_user_id,
                   stage_entered_at, status, created_at, updated_at)
flows             (id, nome, descricao, ativo, trigger_config jsonb,
                   nodes jsonb, edges jsonb, created_at, updated_at)
flow_runs         (id, flow_id, project_deal_id, status, started_at, finished_at, error)
flow_run_steps    (id, run_id, node_id, status, output jsonb, executed_at)
```
RLS: leitura para `authenticated`, escrita/gestão para `fundador` (mesmo padrão do CRM atual).

Trigger SQL: ao `UPDATE crm_deals SET status='won'`, insere em `project_deals` no pipeline default.

**Frontend:**
- `src/pages/crm/Projects.tsx` com sub-tabs (`SectionTabs`).
- `src/components/crm/projects/ProjectsKanban.tsx` (reusa lógica de `KanbanBoard`).
- `src/components/crm/projects/FlowsList.tsx` + `FlowEditor.tsx` (React Flow).
- `src/components/crm/projects/AdminPlaceholder.tsx`.
- Hooks: `src/hooks/useProjects.ts`, `src/hooks/useFlows.ts`.

**Edge functions:**
- `supabase/functions/flow-executor/index.ts` — recebe `{ project_deal_id, trigger }`, carrega flows ativos com trigger correspondente, executa nodes (Email via Resend, WhatsApp via Twilio gateway, delays via re-agendamento).
- Cron job (`pg_cron`) a cada minuto para retomar runs com delay pendente.

**Dependências novas:** `@xyflow/react` (React Flow v12).

**Connectors a habilitar:**
- Resend (email) — ao chegar na etapa de Fluxos.
- Twilio (WhatsApp) — ao chegar na etapa de Fluxos, vou perguntar antes de conectar.

**Navegação:** adiciono `/crm/projects` no `Crm.tsx` (sub-aba) com 3 sub-rotas internas via state ou path nested.

---

## Ordem de implementação

1. Migrations (tabelas + trigger won→project) — pedir aprovação.
2. Página `Projects` com sub-tabs e Kanban funcional (drag & drop, CRUD pipelines/stages/deals).
3. Auto-import: botão "puxar de clientes ativos" + trigger automático.
4. Lista de fluxos + editor React Flow (salva JSON, sem execução ainda).
5. Conectar Resend, implementar `flow-executor` com Email + Delay + Update.
6. Conectar Twilio, adicionar node WhatsApp.
7. Placeholder Admin "Em breve".