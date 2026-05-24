## Melhorias no Editor de Fluxos

Mudanças concentradas em `src/components/crm/projects/FlowEditor.tsx` (com pequena mudança em `src/hooks/useFlows.ts` se necessário). Nenhuma alteração de banco/back.

### 1. Legibilidade do subtítulo dos cards
Hoje o "Email/WhatsApp/Delay/etc." acima do nome usa `text-muted-foreground` (cinza fraco) sobre o fundo translúcido colorido — fica ilegível.
- Trocar para uma cor derivada do `color` do node (mesma paleta do ícone), com peso semibold e opacidade alta: `style={{ color }}` + `font-semibold` + `tracking-wider`.
- O rótulo principal (`data.label`) já é `text-foreground` — mantém.
- Aplicar o mesmo tratamento no chip "Nota" e na descrição do node custom (subir para `text-foreground/80`).

### 2. Multi-seleção e atalhos de teclado
React Flow já suporta `multiSelectionKeyCode` e `selectionKeyCode`. Vamos habilitar e adicionar handlers:
- Props no `<ReactFlow>`: `multiSelectionKeyCode={["Meta","Shift","Control"]}`, `selectionOnDrag`, `panOnDrag={[1,2]}` (botão do meio/direito arrasta, esquerdo faz seleção em área), `deleteKeyCode={["Delete","Backspace"]}`, `selectionKeyCode="Shift"`.
- Usar `onSelectionChange` para guardar `selectedNodes`/`selectedEdges` em estado (substitui o `selected` single atual; o inspector aparece quando há exatamente 1 selecionado).
- Listener global (`useEffect` com `keydown` em `window`) ignorando quando o foco está em `input/textarea/contenteditable`:
  - **Ctrl/Cmd + C**: serializa `selectedNodes` (com offsets relativos ao bounding box) num clipboard interno (`useRef`) — também tenta `navigator.clipboard.writeText(JSON.stringify(...))` para sobreviver entre abas.
  - **Ctrl/Cmd + V**: cola os nodes com novos IDs (`${kind}-${Date.now()}-${i}`), deslocados +24/+24px do mouse/viewport, re-mapeando edges internas entre os nodes copiados.
  - **Ctrl/Cmd + D**: duplica seleção (mesmo fluxo do paste sem clipboard).
  - **Delete/Backspace**: já tratado pelo `deleteKeyCode`, mas garantimos remoção de edges órfãs.
- Atualizar o painel inspector: se `>1` selecionado, mostrar um painel resumido ("N elementos selecionados") com botões **Agrupar em seção** e **Excluir**.

### 3. Agrupamento em seção com controle temporal e conexões laterais
Hoje já existe um node `section` (frame redimensionável). Vamos evoluir:

**Agrupar:**
- Botão "Agrupar em seção" (no painel multi-select e via atalho `Ctrl+G`).
- Calcula o bounding box dos nodes selecionados, cria um node `section` com `position`/`width`/`height` que envolve todos com padding 40px no topo (para o label) e 24px nas demais bordas.
- Faz `parentId` + `extent: "parent"` em cada node filho, recalculando `position` relativa à seção. (React Flow suporta nesting nativo.)
- Atribui `data.config.start_offset_dias = 0` por padrão.

**Controle temporal da seção:**
- Inspector da seção ganha campo "Inicia X dias/semanas após o início do fluxo" (input numérico + select `dias|semanas`), guardado em `data.config.start_offset_dias` / `data.config.start_offset_unit`.
- Exibir o badge no canto superior direito da seção (mesmo padrão visual do `dayBadge` dos nodes).
- Campo adicional "Duração estimada" opcional (`duration_dias`) só para visualização.

**Conexões laterais entre seções:**
- Adicionar `Handle type="target" position={Position.Left}` e `Handle type="source" position={Position.Right}` no `SectionNode` (handles "section-in" / "section-out") com visual maior (12×12, mesma cor da seção).
- Os handles de top/bottom ficam apenas para nodes normais; as seções se conectam horizontalmente entre si.
- Quando o usuário liga uma seção em outra, propagar o `start_offset` calculado (seção destino = seção origem + duração) como sugestão visual (opcional na v1; ok manter manual).
- Edges entre seções recebem `data.kind = "section-link"` e estilo distinto (linha mais grossa, mesma cor das seções, marker maior).

### 4. Auto-save
- `useEffect` que observa `[nodes, edges, name]` com `useRef` para debounce de 1.5s.
- Ignora a primeira execução pós-load (quando popula a partir do `flow`).
- Chama `update.mutateAsync(...)` em silêncio; sem `toast` em cada save.
- Adicionar indicador discreto no toolbar ao lado do nome: estado `idle | saving | saved | error` com ícone (`Loader2` girando / `Check` / `AlertCircle`) e texto pequeno ("Salvo às 14:32" / "Salvando…"). `useRef<Date>` para o timestamp do último save bem-sucedido.
- Manter o botão "Salvar" como força-flush manual.
- Limpar timer no `unmount` e disparar um save final no `onClose` se houver mudanças pendentes.

### Detalhes técnicos
- Clipboard interno: `const clipboardRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null)`.
- Bounding box helper: `min/max` de `x, y, x+width, y+height` dos selecionados.
- Para nodes com `parentId`, ao colar fora de uma seção limpamos `parentId`/`extent`.
- `onSelectionChange` é chamado pelo React Flow sempre que a seleção muda — fonte da verdade única.
- Não tocar em `useFlows.ts` a não ser que precisemos de uma variante `silent` do update (preferência: reusar `useUpdateFlow` direto, com flag local pra não emitir toast).

### Fora de escopo
- Persistência de "grupos" como entidade no banco (continuam sendo nodes do tipo `section` no JSON).
- Execução real do offset temporal pelo motor de fluxo (apenas UI + dado).
- Undo/redo global (deixar pra próxima iteração).