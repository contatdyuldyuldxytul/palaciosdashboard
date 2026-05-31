# Plano: mover deal entre pipelines + Kanban com muitos stages

## 1. Botão "Mudar de pipeline" dentro do deal

**Onde:** `src/pages/CrmDealDetail.tsx`, no header do deal (logo após o nome do pipeline atual na linha 186, ou ao lado dos botões "Marcar como Ganho/Perdido" na linha 244).

**Comportamento:**
- Botão discreto com ícone `ArrowRightLeft` + label "Mudar pipeline" (mostra o pipeline atual ao lado, ex.: `Pipeline: Aline ▾`).
- Ao clicar, abre o mesmo diálogo de duas etapas já usado no Kanban (`MoveToPipelineDialog` em `src/components/crm/KanbanBoard.tsx`, linhas 362-449): primeiro escolhe o pipeline, depois o stage de destino.
- Após mover: atualiza `pipeline_id`, `stage_id`, `stage_entered_at`; invalida `["crm"]` e `["crm","deal",id]`; toast de confirmação; permanece na mesma página (o deal continua válido, só muda o pipeline/stage exibido na barra de progresso).

**Refactor:** extrair `MoveToPipelineDialog` para `src/components/crm/MoveToPipelineDialog.tsx` (componente standalone reutilizável) e importar tanto no Kanban quanto no CrmDealDetail. Sem mudança de lógica, só mover o componente.

## 2. Kanban: stages "achatados" até 7, slider acima de 7

**Onde:** `src/components/crm/KanbanBoard.tsx`, linhas 294-306 (o container `<div className="flex gap-3 ... overflow-x-auto">`).

**Regra:**
- **≤ 7 stages:** as colunas dividem o espaço disponível igualmente (`flex-1 min-w-0`, sem scroll horizontal). Comportamento atual, mas removendo o `overflow-x-auto` para garantir que fiquem 100% encaixadas na tela.
- **> 7 stages:** cada coluna recebe largura mínima fixa (ex.: `min-w-[240px]`) e o container vira scrollável horizontalmente. Adicionar setas de navegação `‹` e `›` flutuantes nas bordas (já que o usuário pediu "slider") que rolam o container em ~260px por clique. Indicador visual sutil (gradient fade nas bordas) quando há conteúdo para rolar.

**Implementação:**
- Calcular `const isCompact = stages.length <= 7;`.
- Container condicional: `flex-1 min-w-0` para compacto vs `min-w-[240px] flex-shrink-0` para wide.
- Ref no container + handlers `scrollBy({ left: ±260, behavior: 'smooth' })` para as setas.
- Setas só aparecem quando `!isCompact`.

**Fora de escopo:** mobile (`SwipeableKanban` já trata isso); mudar cards ou o resto da UI.

## Arquivos afetados

- `src/components/crm/MoveToPipelineDialog.tsx` (novo, extraído)
- `src/components/crm/KanbanBoard.tsx` (importar diálogo extraído + lógica compact/wide + setas)
- `src/pages/CrmDealDetail.tsx` (botão no header + abrir diálogo)
