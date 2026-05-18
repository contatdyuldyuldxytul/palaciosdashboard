# Corrigir duplicação de atividades semanais

## Causa raiz
`PlanoSemanalClaude.tsx > approveAndDistribute()` insere as linhas em `daily_activities` sem qualquer deduplicação. Cada clique em **"Aprovar e distribuir"** (ou re-aprovação) duplica todas as tarefas da semana com `source = 'claude_briefing'`. Confirmado no banco: Felipe tem até 4 cópias da mesma tarefa em 20/05.

## Correção

### 1. `src/components/ceo/PlanoSemanalClaude.tsx` — `approveAndDistribute`
Antes do `insert(rows)`, apagar tudo que já existe para a janela do plano:

```ts
// Apagar atividades 'claude_briefing' da janela week_start..week_start+4
// dos 3 assignees (Aline, Felipe, Milena) para evitar duplicação ao re-aprovar
await supabase
  .from("daily_activities")
  .delete()
  .eq("source", "claude_briefing")
  .gte("scheduled_date", plan.week_start)
  .lte("scheduled_date", addDaysISO(plan.week_start, 4))
  .in("assignee_label", ["Aline", "Felipe", "Milena"]);
```

Isso torna a aprovação **idempotente**: clicar 2x produz o mesmo resultado de clicar 1x. Mantém as tarefas `custom` (manuais ⭐ do usuário) e as `auto` da função nightly intactas, pois filtramos por `source = 'claude_briefing'`.

### 2. Limpeza das duplicatas atuais
Migration única que mantém apenas o `id` mais antigo de cada combinação (assignee_label, scheduled_date, task_type, task_description, source) com `source = 'claude_briefing'`:

```sql
DELETE FROM daily_activities a
USING daily_activities b
WHERE a.source = 'claude_briefing'
  AND b.source = 'claude_briefing'
  AND a.assignee_label IS NOT DISTINCT FROM b.assignee_label
  AND a.scheduled_date = b.scheduled_date
  AND a.task_type = b.task_type
  AND a.task_description = b.task_description
  AND a.completed = false      -- nunca apaga tarefas já concluídas
  AND a.id > b.id;
```

## O que NÃO vou mexer
- `generate-daily-activities` (edge function): está correta, gera com `source: 'auto'`.
- Tarefas manuais (`source = 'manual'` ou `task_type = 'custom'` criadas pelo usuário): preservadas.
- Schema/RLS: sem mudanças.
