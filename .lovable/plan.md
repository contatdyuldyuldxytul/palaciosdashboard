# Integração n8n Cloud — substitui o motor de Fluxos

## Recomendações (das duas dúvidas que você levantou)

**Como "mexer no n8n" pelo dashboard:** REST API do n8n Cloud + webhooks. Você gera 1 API key no n8n e salvamos como secret. Com isso o dashboard consegue:
- Listar todos os workflows da sua conta
- Ativar / desativar
- Ver execuções recentes (sucesso, erro, duração)
- Disparar manualmente ("Executar agora")
- Abrir o workflow no n8n com 1 clique (link direto)

Não vamos *editar* nodes pelo dashboard — isso é o que o n8n já faz lindamente. A ideia é o dashboard ser o **painel de controle**, e o n8n o **canvas de edição**.

**Como o n8n cria tarefas para colaboradores:** Webhook bidirecional. Mais simples e seguro que dar acesso direto ao banco. Fluxo:
1. CRM dispara evento → webhook do n8n
2. n8n decide o que fazer (mandar email, WhatsApp, ler etapa do funil…)
3. Quando precisa de ação humana, n8n chama uma edge function nossa (`flow-task-create`) que insere em `daily_activities`
4. Quando o colaborador marca como concluída, outra edge function (`flow-task-callback`) dispara webhook de volta pro n8n continuar o workflow

n8n consegue ler etapas do funil, dados do deal, person, org via outra edge function (`crm-context`) — não precisa acesso direto ao Postgres.

## Arquitetura

```text
CRM (stage change, deal won, etc.)
  │
  ├─► trigger Postgres ──► edge function `n8n-dispatch`
  │                          (chama webhook configurado do n8n Cloud)
  │
n8n Cloud workflow executa:
  ├─► Email (Gmail node nativo do n8n)
  ├─► WhatsApp (Twilio node nativo do n8n)
  ├─► HTTP → `crm-context`     (ler deal/funil/colaborador)
  ├─► HTTP → `flow-task-create` (criar daily_activity)
  └─► Wait → callback de `flow-task-callback`

Dashboard ◄──► n8n REST API (listar, ativar, executar workflows)
```

## Mudanças no app

### Backend
1. **Migração**:
   - `n8n_workflows` (cache local: workflow_id n8n, nome, ativo, trigger_event, descrição, última sync)
   - `n8n_executions` (cache de execuções recentes pra exibir no dashboard)
   - `n8n_event_bindings` (mapeia evento do CRM → workflow_id + webhook URL). Ex: `crm_stage_enter:<stage_id> → webhook X`
   - Remover (deprecar) `flows`, `flow_runs`, `flow_run_steps`, `flow_task_completions`, triggers `crm_deal_enroll_flows`, `daily_activity_resume_flow`
   - Manter colunas `flow_run_id` / `flow_node_id` em `daily_activities` mas renomear conceito para `n8n_execution_id` / `n8n_node_id` (ou só reaproveitar)

2. **Edge functions**:
   - `n8n-dispatch`: recebe evento interno, chama webhook configurado no n8n
   - `n8n-proxy`: proxy pra REST API do n8n (lista workflows, ativa/desativa, executa) — usa API key do secret
   - `crm-context`: GET autenticado por token compartilhado, devolve JSON de deal/funil/pessoa
   - `flow-task-create`: POST do n8n cria daily_activity (autenticado por token)
   - `flow-task-callback`: quando atividade é concluída, dispara webhook de retorno pro n8n
   - Trigger Postgres em `crm_deals` + `daily_activities` → chama `n8n-dispatch` via `pg_net`

3. **Secrets necessários**:
   - `N8N_API_KEY` (criada em n8n Cloud → Settings → API)
   - `N8N_BASE_URL` (ex: `https://palacios.app.n8n.cloud`)
   - `N8N_WEBHOOK_TOKEN` (token compartilhado que o n8n inclui ao chamar nossas edge functions)

### Frontend — nova aba "Automações (n8n)" substituindo Fluxos
- **Painel de status**: conexão com n8n (verde/vermelho), nº de workflows ativos, execuções últimas 24h
- **Lista de workflows** vinda da API do n8n: nome, status (ativo/inativo), última execução, sucesso/erro
  - Botões: Ativar/Desativar (toggle), Executar agora, Abrir no n8n (link)
- **Bindings de eventos**: tabela "Quando isso acontece → executar este workflow"
  - Eventos disponíveis: deal entra em etapa X, deal won, deal lost, atividade criada, etc.
  - Dropdown de workflows do n8n
- **Histórico de execuções** (das últimas N): timestamp, workflow, status, link pro detalhe no n8n
- **Setup wizard**: tela com 3 passos para colar URL do n8n + API key + testar conexão

### Remoção
- `src/components/crm/projects/FlowEditor.tsx`, `FlowsList.tsx` → deletados
- `src/hooks/useFlows.ts`, `src/hooks/useFlowActivities.ts`, `useFlowAutomation.ts` → substituídos por `useN8n.ts`
- `supabase/functions/flow-worker` → deletado
- Aba "Integrações & Automação" no AdminPlaceholder fica só com Twilio (até remover Twilio também, já que o n8n cuida)

## Ordem de execução
1. Migração (criar `n8n_*`, deprecar `flows`)
2. Secrets (`N8N_API_KEY`, `N8N_BASE_URL`, `N8N_WEBHOOK_TOKEN`) via add_secret
3. Edge functions `n8n-proxy` + `crm-context` + `flow-task-create` + `flow-task-callback` + `n8n-dispatch`
4. Trigger Postgres de dispatch
5. UI: nova aba "Automações" (lista, bindings, execuções, setup wizard)
6. Remover código velho de flows
7. Documentar no app: workflow exemplo "Deal entra em Negociação → criar tarefa de follow-up para Aline em 2 dias"

## Pré-requisitos seus (eu te guio na hora)
- Criar conta n8n Cloud (plano Starter ~US$20/mês ok pra começar)
- Em **Settings → n8n API**: gerar API key
- Me dar a URL da instância (ex: `palaciosos.app.n8n.cloud`)

## Fora de escopo (por enquanto)
- Editor visual de workflow dentro do dashboard (use o n8n direto)
- IA distribuidora de tarefas (você pediu pra deixar de lado)
- Migração automática dos fluxos existentes (vamos recriar no n8n — são poucos)
