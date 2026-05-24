## Objetivo

Remover o painel separado "Tarefas do Fluxo" da aba Atividades e integrar essas tarefas diretamente no painel Checklist de cada colaborador.

## Mudanças

**1. `src/components/crm/atividades/NucleoOperacional.tsx`**
- Remover o import e a renderização do `FlowTasksList` (linhas 8 e 60-64).
- Manter o seletor de colaborador e o dashboard correspondente intactos.

**2. `src/components/DailyTasksPanel.tsx`** (componente "Checklist" usado por TeamMemberDashboard, LdrMemberDashboard e ThiagoDashboard)
- Adicionar chamada ao hook `useFlowActivities({ owner_label: assigneeLabel })`.
- Renderizar uma nova seção "Tarefas do Fluxo" no topo da lista, dentro do mesmo card glass do Checklist:
  - Em "Hoje": mostrar `grouped.atrasadas` + `grouped.hoje`.
  - Em "Semana": mostrar todos (atrasadas, hoje, amanhã, próximos 7 dias filtrados por `dia_offset`).
  - Cabeçalho discreto "Fluxo" + contador, separador visual antes da lista de tarefas diárias existentes.
  - Cada item reusa o visual do `TaskRow` (checkbox + ícone do kind + label + deal/pipeline + data + atraso). Toggle via `useToggleFlowTask`.
- Se não houver tarefas de fluxo, não renderizar a seção (sem mensagem vazia extra).
- Manter toda a lógica atual de cadência/manual/estratégia inalterada abaixo.

**3. Não alterar** `FlowTasksList.tsx` (fica disponível, mas deixa de ser usado em Atividades). Pode ser removido depois se confirmado.

## Resultado

- Aba Atividades > Núcleo Operacional não exibe mais o card "Tarefas do Fluxo" no topo.
- Cada Checklist de colaborador (Aline, Milena, Felipe, Thiago) passa a listar as tarefas de fluxo dele junto com as tarefas diárias, respeitando os filtros Hoje/Semana.
