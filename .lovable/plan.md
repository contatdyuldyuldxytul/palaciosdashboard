# Centro de Comando Operacional — Palacios 3D Studio

Evolução do dashboard para conectar **estratégia mensal → campanhas → tarefas diárias automáticas**, com importação de sessões estratégicas via JSON e sincronização com Pipedrive.

---

## 1. Schema Supabase (aditivo, sem quebrar o existente)

Migration única criando 7 tabelas + RLS + RPCs. Nada do checklist atual (`checklist_checks`, `custom_activities`) é dropado — apenas migrado em paralelo.

**Tabelas:**

1. `monthly_strategies` — snapshot mensal (cash_target, foco, alocação, locked, source).
2. `campaigns` — vinculadas a `monthly_strategies`, com `playbook_type`, KPIs em jsonb, `custom_templates`.
3. `campaign_leads` — liga `pipedrive_deal_id` à campanha; rastreia `current_day_in_flow`, `group A/B`, status.
4. `cadence_templates` — passos por playbook/dia/período/canal com placeholder `{{lead_name}}`/`{{lead_company}}`.
5. `daily_activities` — tarefas geradas; `task_type`, `priority`, `source` (auto/manual/claude_briefing), `related_deal_id`, `completed`.
6. `strategic_inputs` — fila de insights externos (briefing diário) com `processed` flag.
7. `weekly_reports` — métricas + narrativa semanal.

**RLS:**
- Usuários autenticados leem/atualizam suas próprias `daily_activities`.
- `monthly_strategies` e `campaigns`: leitura para todos autenticados, escrita só para `fundador` (Thiago).
- `strategic_inputs` e `import_monthly_strategy`: RPCs `SECURITY DEFINER` chamáveis via service role (chave usada pelo script Python externo).

**RPCs:**
- `insert_strategic_input(target_user_id, task_description, priority, source_type, related_deal_id)`
- `import_monthly_strategy(payload jsonb)` — faz upsert transacional de strategy + campaigns + leads + custom_templates.

**Migração de histórico:** copia `checklist_checks` concluídos → `daily_activities` com `task_type='cadence'`, `source='manual'`, preservando `concluido_em`.

**Seed:** `cadence_templates` para `cadence_2_0` (20 linhas — manhã/tarde dos 10 dias) + `monthly_strategies` vazia para 2026-05.

---

## 2. Edge Functions

Todas em `supabase/functions/`, deploy automático.

- **`generate_daily_activities`** — para cada `campaign_lead` ativo, calcula próximo `current_day_in_flow` (pula sábado/domingo), busca `cadence_templates` (com override de `custom_templates`), renderiza placeholders e insere em `daily_activities`. Depois consome `strategic_inputs` não processados. Limita a 10/usuário por prioridade; resto fica em fila.
- **`sync_pipedrive`** — atualiza `status` e `last_synced_at` dos `campaign_leads` consultando `https://palacios3dstudio.pipedrive.com/api/v1/deals/{id}`. Usa secret `PIPEDRIVE_API_KEY` já existente.
- **`generate_weekly_report`** — métricas por usuário/campanha, insere em `weekly_reports`, dispara webhook em `WEEKLY_REPORT_WEBHOOK` (novo secret a pedir).

**Agendamento via pg_cron** (habilitar `pg_cron` + `pg_net`):
- 23:00 BRT (02:00 UTC) diário → `generate_daily_activities`
- A cada 30 min → `sync_pipedrive`
- Sexta 17:00 BRT (20:00 UTC) → `generate_weekly_report`

---

## 3. Frontend — nova página `/comando` com 4 abas

Reusa o glassmorphism dark do projeto (não o azul claro do briefing — mantenho consistência com a Memory de aesthetic). Confirmo no fim se quer migrar para o azul `#0a3a5c` claro descrito.

**Aba "Hoje"** (`TabHoje.tsx`): lista `daily_activities` do usuário logado para hoje, ordenada por `priority desc`, máx 10. Checkbox grande, link Pipedrive quando houver `related_deal_id`, header com X/Y + barra, badge de origem (cinza/azul/verde). Mobile-first.

**Aba "Semana"** (`TabSemana.tsx`): pipeline counts por etapa quente (vindos do hook `usePipedrive` existente), tarefas dos próximos 5 dias úteis agrupadas por usuário, deals movimentados na semana, progresso por campanha ativa.

**Aba "Estratégia"** (`TabEstrategia.tsx`, restrita a `fundador`):
- Card do mês corrente com meta/foco/alocação editáveis enquanto `locked=false`.
- Lista de `campaigns` ativas com barra de progresso (dia X/Y, % KPI).
- Botão **"+ Nova campanha manual"** (modal CRUD).
- Botão **"📥 Importar JSON"** → modal com `<textarea>` (syntax highlight via `react-syntax-highlighter`), validação Zod do schema, preview "criar/atualizar X campanhas, Y leads", confirmação, chama RPC `import_monthly_strategy`, redirect para Hoje.
- Editor de `cadence_templates` com preview de tarefa renderizada.
- Histórico: dropdown de meses anteriores.

**Aba "Relatórios"** (`TabRelatorios.tsx`): lista de `weekly_reports`, click abre detalhe (métricas + narrativa), filtro por mês.

---

## 4. Sidebar — adicionar Thiago e Felipe

Em `AppSidebar.tsx`, no array `subItems` da seção Vendas, adicionar:
- `{ title: "Thiago", url: "/equipe/thiago", parentUrl: "/vendas", initials: "TH", color: "#0a3a5c" }`
- `{ title: "Felipe", url: "/equipe/felipe", parentUrl: "/vendas", initials: "FE", color: "#f97316" }`

Novas rotas em `App.tsx` reusando `TeamMemberDashboard` (Thiago como closer, Felipe como BDR júnior local — sem Pipedrive). Cada uma renderiza versão filtrada das abas Hoje + Semana para aquele usuário. Aline/Milena permanecem intactas.

Adicionar item de topo "Comando" (ícone `Command`) no sidebar apontando para `/comando`.

---

## 5. Integração externa (script Python)

Documentar no chat (não no código): endpoint `https://zluhkwrcoupmqdhnjjew.supabase.co/rest/v1/rpc/insert_strategic_input` e `…/import_monthly_strategy`, usando `SUPABASE_SERVICE_ROLE_KEY` no header. Script de exemplo em comentário.

---

## Detalhes técnicos

- Validação client-side: `zod` para JSON de importação.
- Realtime: habilitar em `daily_activities` para a aba Hoje atualizar sozinha.
- `daily_activities.user_id` referencia `auth.users` mas armazena também `assignee_label` (text) para Felipe enquanto não tiver login real — simplificação: cria `auth.users` para Felipe via convite e usa o id real. Confirmo abaixo.
- Hooks novos: `useDailyActivities`, `useCampaigns`, `useMonthlyStrategy`, `useWeeklyReports`.
- Fuso: tudo em America/Sao_Paulo (já é convenção do projeto via Memory).

---

## Perguntas antes de executar

1. **Tema visual da nova área**: manter o glassmorphism dark do resto do app, ou usar o azul `#0a3a5c` sobre fundo claro como no briefing? (Recomendo manter dark para consistência.)
2. **Felipe sem login**: crio um `auth.users` para ele agora (você dá o e-mail) ou trato como "assignee virtual" até liberar acesso?
3. **Webhook semanal**: já tem URL para o `WEEKLY_REPORT_WEBHOOK` ou crio o secret depois?
4. **Migração do checklist atual**: copio só os `checklist_checks` do mês corrente ou histórico inteiro para `daily_activities`?

Aprove ou ajuste e eu executo a migration + edge functions + UI numa sequência só.