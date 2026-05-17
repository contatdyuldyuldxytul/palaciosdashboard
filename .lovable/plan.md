## Objetivo

Nos dashboards de colaboradores, remover o "Checklist do Dia" (componente `CadenceChecklist`) e mover o "Checklist" grande (componente `DailyTasksPanel` com subtítulo "Tarefas atribuídas · cadência, follow-ups, estratégia") para o lugar dele — ficando lado a lado com "Reuniões do Mês" / "Feed de Atividades", ocupando a mesma metade da grid.

## Arquivos afetados

- `src/pages/TeamMemberDashboard.tsx` (Aline e demais SDRs)
- `src/pages/LdrMemberDashboard.tsx` (Milena)
- `src/pages/ThiagoDashboard.tsx` — já está no formato correto (sem `CadenceChecklist` e com `DailyTasksPanel` em meia coluna). **Sem mudanças.**

## Mudanças

### TeamMemberDashboard.tsx
1. Remover o bloco full-width `DailyTasksPanel` (linhas ~261–270, comentário "Checklist Hoje/Semana").
2. Na ROW 2 (`grid lg:grid-cols-2`, linha ~340), substituir `<CadenceChecklist ... />` por `<DailyTasksPanel mode={...} title="Checklist" subtitle="Tarefas atribuídas · cadência, follow-ups, estratégia" />` com o mesmo `mode` que estava no full-width (pipedrive id 24578358 para Aline, `disabled` para os outros).
3. Remover o import de `CadenceChecklist` se não houver outro uso na página.

### LdrMemberDashboard.tsx
1. Remover o bloco full-width `DailyTasksPanel` (linhas ~297–302).
2. Na ROW 2 (linha ~371), substituir `<CadenceChecklist colaborador={memberName} accentColor="hsl(45,80%,55%)" />` por `<DailyTasksPanel mode={{ kind: "milena" }} title="Checklist" subtitle="Tarefas atribuídas · cadência, follow-ups, estratégia" />`.
3. Remover o import de `CadenceChecklist` se não houver outro uso.

## Resultado

```text
ROW 2 (lg:grid-cols-2):
┌─────────────────────────────┬─────────────────────────────┐
│  Checklist (DailyTasksPanel)│  Reuniões do Mês / Feed     │
│  Hoje · Semana              │                             │
└─────────────────────────────┴─────────────────────────────┘
```

O componente `CadenceChecklist` continua existindo no codebase (não vou apagar o arquivo) caso seja usado em outro lugar no futuro, mas deixa de aparecer nos dashboards dos colaboradores.