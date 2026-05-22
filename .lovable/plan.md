## Refactor: Gerenciamento de Pipelines (estilo Pipedrive)

Substituir o atual modal "Gerenciar Pipelines" + modal de edição por uma UX em duas camadas, igual ao Pipedrive das imagens enviadas.

### 1. Seletor de Pipeline (substitui as pills atuais)

Trocar a fileira de pills no header por um **dropdown único** ao lado do título:

```text
[ Pipeline de Deals ▾ ]   [ ✎ Editar ]   ...resto do header
       VENDAS
```

Conteúdo do dropdown (mesmo padrão da imagem 1):
- Header "Pipeline" com ícone de lápis (abre editor do pipeline ativo)
- Lista de pipelines ativos, com ✓ marcando o atual
- Separador
- "➕ Novo pipeline" (abre o editor vazio)
- "🗑 Desativar pipeline atual" (com confirmação)

O botão "Gerenciar Pipelines" e o `PipelineManagerModal` antigo são **removidos** — toda a gestão acontece no dropdown + tela de edição.

### 2. Tela de Edição (substitui o modal estreito)

Em vez de `Dialog` apertado, abrir uma **rota/overlay full-screen** estilo Pipedrive (imagem 2):

- Header fixo com:
  - "Editar Pipeline" + input inline `Pipeline name`
  - Select de tipo de fluxo + select de responsável
  - Botões `Cancelar` / `Salvar alterações`
- Área principal: **colunas horizontais com scroll**, uma por etapa, igual o board real
  - Cada coluna tem: nome editável, cor, toggles Ganho/Perda, botão "Excluir Etapa" no rodapé
  - Drag & drop horizontal para reordenar (substitui as setas ▲▼)
  - Botão `+ Adicionar Etapa` como coluna fantasma no final

Implementação: novo componente `PipelineEditorScreen.tsx` montado como overlay (`fixed inset-0 z-50`) dentro do `Crm.tsx`, controlado por estado `editorPipelineId | "new" | null`. Reaproveita todos os hooks atuais (`useCreatePipeline`, `useUpdatePipeline`, `useReplaceStages`, `useCollaborators`).

### 3. Arquivos

**Novos**
- `src/components/crm/PipelineSwitcher.tsx` — dropdown do seletor
- `src/components/crm/PipelineEditorScreen.tsx` — tela full-screen com colunas

**Editados**
- `src/pages/Crm.tsx` — remove pills + botão "Gerenciar"; adiciona switcher e overlay
- (opcional) usar `@dnd-kit/core` já presente no projeto para drag horizontal das etapas

**Removidos**
- `src/components/crm/PipelineManagerModal.tsx`
- `src/components/crm/PipelineEditorModal.tsx` (substituído pela Screen)

### 4. O que NÃO muda

- Schema do banco (`crm_pipelines`, `crm_stages`) permanece igual
- Hooks em `useCrm.ts` permanecem iguais
- KanbanBoard, busca, importações CSV/Sheets/Pipedrive não são tocados

Confirma que posso seguir?
