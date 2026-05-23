## Objetivo
Hoje o campo de agendamento no Editor de Fluxo aceita só um número de dias (`dia_offset`). Vou adicionar a opção de expressar o intervalo em **dias OU semanas**, mantendo a base de cálculo em dias (compatível com `useFlowActivities` e com `flow_task_completions`).

## Mudanças (somente front-end, sem migration)

### 1. `FlowEditor.tsx` — campo "Dia do fluxo"
Substituir o input único por um par **número + seletor de unidade**:

```
[ 2 ] [ Semanas ▾ ]   → grava dia_offset = 14
[ 3 ] [ Dias    ▾ ]   → grava dia_offset = 3
```

- Unidade default: `Dias`.
- Ao salvar: `dia_offset = valor * (unidade === "semanas" ? 7 : 1)`.
- Ao abrir um node existente: se `dia_offset % 7 === 0 && dia_offset >= 7`, pré-seleciona `Semanas` e mostra `dia_offset / 7`; caso contrário `Dias`.
- A unidade escolhida é só UI (não persistida) — a fonte de verdade continua `config.dia_offset` em dias, então nada quebra em `useFlowActivities`, `FlowTasksList` nem no banco.
- Helper text atualizado: "Aparece na aba Atividades no dia certo a partir da entrada no pipeline."

### 2. `FlowTasksList.tsx` — agrupamento por semana
Adicionar um toggle no topo: **Dia / Semana**.
- **Dia** (atual): mantém os grupos Atrasadas / Hoje / Amanhã / Próximos.
- **Semana**: agrupa por `Semana 1 (D1–D7)`, `Semana 2 (D8–D14)`, etc., calculadas a partir de `flow_started_at` do deal. Cada item continua mostrando "Dia X".

### 3. Badge no card do node (`FlowEditor`)
No card do node renderizado no canvas, atualizar o badge atual de "Dia X" para mostrar de forma compacta:
- `D3` quando dias
- `S2` quando semanas (com tooltip "Dia 14")

## Fora de escopo
- Migration / mudanças no banco (não há).
- Mudar `useFlowActivities` (continua lendo `dia_offset` em dias).
- Suporte a meses / horas.

## Arquivos
- `src/components/crm/projects/FlowEditor.tsx` — campo de unidade + badge.
- `src/components/crm/atividades/FlowTasksList.tsx` — toggle Dia/Semana e agrupamento semanal.
