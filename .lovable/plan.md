Unificar a "Checklist" como única lista em todos os perfis de colaborador, removendo a "Checklist do Dia" duplicada (componente `CadenceChecklist`).

## Mudanças por arquivo

**1. `src/pages/TeamMemberDashboard.tsx` (Aline e Felipe)**

- Remover o bloco `<CadenceChecklist ... />` da ROW 2 (linha ~342) e o import.
- A linha de cima continua com `DailyTasksPanel` (title="Checklist"), que vira a única.
- Ajustar o grid da ROW 2 (hoje `grid-cols-1 lg:grid-cols-2`) para acomodar só o Activity Feed do lado, ou converter em coluna única caso o Activity Feed estivesse acoplado ao checklist removido — confirmar olhando o JSX antes de editar.

**2. `src/pages/LdrMemberDashboard.tsx` (Milena)**

- Remover `<CadenceChecklist ... />` (linha ~372) e o import.
- Mesmo ajuste de grid da ROW 2.

**3.** `src/pages/ThiagoDashboard.tsx` **(Thiago)**

- Thiago só tem um painel, mas com título "Checklist do Dia". Renomear para `title="Checklist"` (linha 189) para padronizar com os demais.

## Não-mexer

- `CadenceChecklist.tsx` em si não será deletado neste passo (pode estar referenciado em outros lugares fora do escopo); apenas removido dos dashboards de colaborador.
- Nenhuma mudança em hooks, dados, ou backend.

## Verificação

- Build/preview dos perfis `/equipe/aline`, `/equipe/felipe`, `/equipe/milena` e do dashboard do Thiago para confirmar que sobra apenas um bloco "Checklist".