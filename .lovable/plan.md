## Diagnóstico

A distribuição **já funciona** — o botão "Reaprovar e Redistribuir" insere uma linha em `daily_activities` para cada tarefa de cadência, por pessoa (Aline → `user_pipedrive_id 24578358`, Felipe → `26351800`, Milena → `assignee_label='Milena'`) e por dia (`scheduled_date = week_start + i`). O painel **Núcleo Operacional → Checklist** (DailyTasksPanel) lê exatamente essa tabela filtrando por `user_pipedrive_id` / `assignee_label='Milena'` e `scheduled_date = hoje`.

O motivo de "Sem tarefas para hoje" no print é simples: o único `weekly_plan` aprovado tem `week_start = 25/05/2026` e `week_end = 29/05/2026`. Hoje é **01/06/2026** — a redistribuição gravou as atividades nos dias 25–29/05, então no checklist de hoje aparece vazio. Não há plano para a semana atual.

Há também um segundo papercut: criar um novo plano só aparece quando não existe nenhum (`plan === null`); como já existe o plano de maio, o CEO não consegue criar o da semana corrente pela UI.

## O que vou implementar

Tudo em `src/components/ceo/PlanoSemanalClaude.tsx` (frontend apenas — a lógica de insert em `daily_activities` já está certa).

1. **Auto-realinhar a semana na hora de redistribuir**
   - Em `approveAndDistribute`, se `plan.week_start` for anterior à segunda-feira atual (TZ São Paulo), atualizar automaticamente `week_start` para a segunda atual e `week_end` para a sexta correspondente antes do `update` + `insert`. Assim o clique no botão "Reaprovar e Redistribuir" sempre joga as tarefas para a semana corrente, mantendo a cadência editada.
   - Toast informando: "Plano realocado para a semana de DD/MM a DD/MM e atividades distribuídas".

2. **Botão "Nova semana" no header do plano**
   - Adicionar um botão discreto ao lado do badge de status que cria um novo `weekly_plan` (`week_start = segunda atual`, `status='draft'`) copiando a cadência do último plano (sem `extras_*`). Assim o CEO mantém histórico e gera a semana nova com 1 clique.
   - Reaproveitar `criarPlanoManual` extraído para `criarProximaSemana` com pré-preenchimento da cadência.

3. **Banner de aviso quando o plano está fora da semana corrente**
   - Acima da seção "Cadência da Semana", se `week_end < hoje`, mostrar pílula amarela: "Este plano é de uma semana passada. Clique em 'Reaprovar e Redistribuir' para movê-lo para a semana atual, ou crie um novo plano."

4. **Garantir ordem por período no checklist**
   - Ao montar `rows` no `approveAndDistribute`, gravar `notes` com `"manha"` ou `"tarde"` e usar `priority` decrescente (manhã=6, tarde=5) para a ordenação atual do DailyTasksPanel (`order priority desc`) refletir manhã antes de tarde. Mantém compat com os filtros existentes.

5. **Limpar duplicatas antigas com mesma janela**
   - A função já deleta `source='claude_briefing'` entre `week_start` e `week_start+4`. Estender para também deletar a janela antiga do plano (antes do realinhamento) usando os valores prévios de `week_start`/`week_end`, evitando linhas órfãs na semana passada.

## Detalhes técnicos

- TZ: usar a helper existente `getMondayISO()` (já considera UTC-3 São Paulo).
- Não mexer em `daily_activities` schema, RLS, ou na edge function — verificado via `psql` que os inserts atuais funcionam (30 linhas presentes para 25–29/05).
- Não tocar em `AIDailyChecklist` / `metas_distribuidas` (esse é outro fluxo: CeoGoalSetting).
- Nenhum backend novo; apenas mudanças em `PlanoSemanalClaude.tsx`.

## Resultado esperado

- CEO clica em "Reaprovar e Redistribuir" no plano de 25/05 → plano é movido para a semana de 01/06 a 05/06, e as tarefas aparecem em Atividades → Núcleo Operacional → Aline / Felipe / Milena no dia certo (segunda = `d0`, terça = `d1`, …).
- Atividades já presentes (5×7 tarefas/dia da Aline e Felipe + meta Milena) passam a aparecer no painel "Checklist" do colaborador correspondente para o dia atual da semana.
