## Objetivo
Tornar o "quando" (dia/semana) das etapas visível **na visão geral do fluxo** e permitir **segmentações estilo Figma** (frames/agrupamentos) para organizar nodes por fase, dia ou tema — sem precisar clicar em cada etapa.

## Mudanças (somente front-end, sem migration)

### 1. Badge de dia/semana visível no card do node
Em `FlowEditor.tsx` → `FlowNode`:
- Sempre que o node tiver `config.dia_offset`, renderizar um badge discreto no canto superior direito do card:
  - `D3` se `dia_unit !== "semanas"` (ou valor não múltiplo de 7)
  - `S2` se `dia_unit === "semanas"` (com `title="Dia 14"`)
- Estilo: chip pequeno (`text-[9px]`, `px-1.5 py-0.5`, `rounded-md`, fundo `bg-white/10`, borda `border-white/15`), cor herda do node.
- Aparece sem precisar selecionar o node.

### 2. Segmentações estilo Figma (frames/seções)
Adicionar um novo tipo de node `section` (group/frame visual):
- Renderizado como um **retângulo grande translúcido** atrás dos outros nodes, com um label no topo esquerdo (ex.: "Semana 1 — Prospecção").
- Redimensionável (usa `NodeResizer` do `@xyflow/react`).
- Cor personalizável (paleta `COLOR_SWATCHES` reaproveitada).
- `zIndex` negativo para ficar atrás dos outros nodes.
- Não tem handles (não conecta a nada).
- Não bloqueia interação: os nodes "filhos" são apenas sobrepostos visualmente — não há parentNode real, para manter simples e não quebrar o cálculo de `dia_offset` existente.

Na paleta lateral, adicionar uma terceira seção **"Organização"** com o botão **Seção** (ícone `Square` ou `LayoutGrid`).

No inspector, quando o node selecionado for `section`:
- Campo **Título** (já é `label`)
- Campo **Cor** (paleta)
- Campo **Descrição** opcional (texto pequeno abaixo do título no canvas)

### 3. Ajuste no inspector
Remover o badge "Dia X" do inspector se ficar redundante — manter só o helper text. (O badge visível no card já comunica.)

## Fora de escopo
- Parent/child relationship real entre seção e nodes (drag automático junto). Pode vir depois.
- Migration ou mudança no schema (`section` é apenas mais um `kind` salvo dentro do array `nodes` do fluxo, igual aos demais).
- Mudar `useFlowActivities` ou `FlowTasksList`: seções são puramente visuais e ignoradas pela geração de atividades (filtramos por `kind !== "section"`).
- Auto-agrupar nodes por dia/semana automaticamente — o usuário desenha as seções manualmente, como no Figma.

## Arquivos
- `src/components/crm/projects/FlowEditor.tsx` — novo `kind: "section"`, render do badge no `FlowNode`, item na paleta, inspector da seção, `NodeResizer`.
- `src/hooks/useFlowActivities.ts` — adicionar filtro `kind !== "section"` ao iterar os nodes (defensivo).
