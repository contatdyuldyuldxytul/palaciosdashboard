## Objetivo

Transformar a aba **Fluxos do Processo** em automação 100% funcional: quando um deal entra em uma etapa do CRM (ou um projeto vira ativo), o fluxo desenhado no editor **executa de verdade** — envia emails, dispara mensagens de WhatsApp via Twilio, cria tarefas para o colaborador responsável e respeita delays/condições. IA fica de fora nesta fase.

---

## Como vai funcionar (visão de produto)

```text
 Deal entra na etapa X  ─►  cria flow_run (fila)
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   [Email node]         [WhatsApp node]         [Task node]
   envia via Gmail      envia via Twilio        cria daily_activity
   marca completed      marca completed         para responsável
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
                         [Delay 3 dias]
                              ▼
                  worker volta após resume_at
                              ▼
                      próximos nós…
```

- Cada fluxo tem um **trigger** configurável (entrada em etapa do CRM, ou criação de project_deal).
- A cada 5 min um **worker (edge function via pg_cron)** processa runs pendentes.
- Nós automáticos (`email`, `whatsapp`, `update`, `delay`, `condition`) executam sozinhos.
- Nós humanos (`task`, `custom`, `milestone`) criam uma `daily_activity` para o `owner_label` do deal — quando o colaborador marca como feita no checklist diário, registra `flow_task_completion` e libera os próximos nós.

---

## Etapas

### 1. Configuração de fluxo (frontend)
- Painel **Trigger** no `FlowEditor`: escolher "Entrada em etapa do CRM" + pipeline + stage (grava em `flows.trigger_config`).
- Painel de configuração por nó (já parcialmente existe), padronizar para:
  - **Email**: `subject`, `body` (com `{{deal.titulo}}`, `{{person.nome}}`, `{{owner.label}}`), `from_account`.
  - **WhatsApp**: `template_text` + checkbox "usar template Twilio aprovado" + `template_sid` opcional.
  - **Task / Custom**: `titulo`, `descricao`, `prioridade`, `assignee` (default: owner do deal).
  - **Delay**: `dias` / `horas`.
  - **Condition**: campo + operador + valor (sobre o deal).

### 2. Configuração global de WhatsApp/Twilio
- Conectar o **conector Twilio** da Lovable (via `standard_connectors--connect`).
- Tela **Admin → Integrações → WhatsApp**: input para "Número From WhatsApp Business" (E.164, ex: `whatsapp:+5511...`) salvo em uma nova tabela `integration_settings` (key/value).
- Indicador visual de status (conectado / faltando número / desconectado).

### 3. Banco de dados (migração)
- `integration_settings (key text pk, value jsonb)` para guardar o número Twilio e outras configs.
- `flows.trigger_config` passa a ter shape: `{ type: 'crm_stage_enter', pipeline_id, stage_id }`.
- Adicionar coluna `flow_runs.crm_deal_id uuid` (hoje só tem `project_deal_id`).
- Trigger Postgres em `crm_deals` (AFTER UPDATE de `stage_id`): se algum fluxo ativo tem `trigger_config.stage_id = NEW.stage_id`, insere uma linha em `flow_runs` com `status='pending'`, `resume_at=now()`, `context={deal_id, current_node=trigger_node_id}`.
- Trigger análogo para `project_deals` (criação) reutilizando o que já existe.

### 4. Edge function `flow-worker` (motor)
- `supabase/functions/flow-worker/index.ts`.
- Roda a cada 5 min via `pg_cron` + `pg_net`.
- Lógica por iteração:
  1. Seleciona até 50 `flow_runs` com `status='pending'` e `resume_at <= now()`.
  2. Para cada run: carrega `flow.nodes/edges`, encontra o próximo nó a partir de `current_node_id`.
  3. Executa o nó conforme `kind`:
     - `email`: chama `gmail-send` (já existe) com template renderizado.
     - `whatsapp`: POST para Twilio gateway (`/Messages.json` com `To`, `From`, `Body`).
     - `task` / `custom` / `milestone`: insere `daily_activities` (assignee_label = owner do deal, `source='flow'`, `related_deal_id`, `notes` com flow_id+node_id) e marca run como `waiting_human`.
     - `delay`: seta `resume_at = now() + offset` e mantém `pending`.
     - `condition`: avalia, escolhe edge `yes`/`no` ou `else`.
     - `update`: aplica patch em `crm_deals` (ex: mover etapa, mudar temperatura).
  4. Cria `flow_run_steps` com `status` e `output` de cada execução.
  5. Avança `current_node_id` para o próximo nó conectado; sem próximos = `status='completed'`.
- Tratamento de erro: marca step `failed`, run vai para `status='error'` com mensagem; não trava a fila.

### 5. Auto-completion de tarefa humana
- Quando colaborador marca uma `daily_activity` com `source='flow'` como `completed`, um trigger Postgres:
  - Insere em `flow_task_completions (deal_id, flow_id, node_id, completed_by)`.
  - Atualiza o `flow_run` correspondente: `status='pending'`, `resume_at=now()` → worker pega na próxima iteração e avança.
- Botão "Concluir e avançar fluxo" no `AIDailyChecklist` para tarefas com `task_type='flow'`.

### 6. UI de monitoramento
- Nova aba **Runs** no `FlowEditor` mostrando, para o fluxo aberto: deal, status, nó atual, última execução, erro. Lê `flow_runs` + `flow_run_steps`. Botão "Re-executar" e "Cancelar".
- Badge ▶ "ao vivo" no card da lista de fluxos contando runs ativos.

### 7. Testes / validação manual
- Botão **Testar fluxo** no editor: simula com um deal escolhido, executa os nós em modo `dry_run=true` (não envia email/WhatsApp de verdade, só registra `flow_run_steps` com `output` mockado).
- `supabase--curl_edge_functions` para validar o worker com payload sintético antes de ligar o cron.

---

## Detalhes técnicos

- **Conector Twilio**: usar gateway `https://connector-gateway.lovable.dev/twilio/Messages.json` com `TWILIO_API_KEY` + `LOVABLE_API_KEY`. Body `application/x-www-form-urlencoded` com `To=whatsapp:+55...`, `From=<número configurado>`, `Body=<texto>`.
- **Email**: reaproveitar `gmail-send` existente (Gmail connector já ativo). Renderização de variáveis em util compartilhada com `cadenceEngine.ts`.
- **Cron**: usar `cron.schedule('flow-worker', '*/5 * * * *', $$ select net.http_post(...) $$)` via `supabase--insert` (não migração, porque contém URL/anon-key específicos do projeto).
- **Idempotência**: cada `flow_run_step` é único por `(run_id, node_id, executed_at)`; worker confere antes de re-executar.
- **Concorrência**: `SELECT ... FOR UPDATE SKIP LOCKED LIMIT 50` para evitar dupla execução se duas instâncias rodarem.
- **RLS**: `integration_settings` só fundador edita; `flow_runs` já está OK.
- **Limite Twilio Brasil**: avisar usuário para ativar SMS Pumping Protection e Geo Permissions (BR) no console Twilio depois de conectar.

---

## Fora do escopo desta fase
- IA escolhendo responsável / reescrevendo texto (combinamos deixar de fora).
- WhatsApp inbound (receber respostas) — só envio nesta fase.
- Recorrência / fluxos cíclicos — fluxos são lineares com delays.
- Editor visual de variáveis de template — usuário digita `{{deal.titulo}}` manualmente nesta fase.

---

## Ordem de execução sugerida

1. Migração: `integration_settings`, coluna `crm_deal_id` em `flow_runs`, trigger de enrollment, trigger de auto-complete.
2. Conectar Twilio + tela de configuração do número.
3. Edge function `flow-worker` + dry-run.
4. UI de trigger e configuração de nós no `FlowEditor`.
5. Aba **Runs** + badges.
6. Ligar pg_cron e testar com um fluxo real ponta a ponta (Email → Delay → Task → WhatsApp).