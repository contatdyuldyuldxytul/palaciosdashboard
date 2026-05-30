## Contexto

Em `src/pages/CrmDealDetail.tsx`:

1. **Notas duplicadas**: as notas aparecem no card **"Notas"** (aba) e também são renderizadas como cartões amarelos dentro do **Histórico** logo abaixo (`HistoryList` recebe `notes` e faz `notes.forEach(...)` adicionando cada nota como item). Resultado: toda nota aparece duas vezes na mesma tela.

2. **Etapas**: atualmente as etapas são pills/"compartimentos" (`px-3 py-1.5 rounded-full ... border`). A versão anterior (commit `1de08df`) era uma **barra horizontal de progresso** — segmentos finos coloridos lado a lado, com o nome da etapa abaixo, totalmente clicáveis. Essa é a estética "slides" que o usuário quer de volta.

## Mudanças

### 1. Remover notas do Histórico

- Em `CrmDealDetail` (área do `<HistoryList />`): parar de passar `notes`.
- Em `HistoryList`: remover o parâmetro `notes`, o bloco `notes.forEach(...)` e o ramo de render `kind === "note"` (cartão amarelo). O componente passa a mostrar só eventos do deal (criação, mudança de etapa/status, atividades, mudanças vindas do Pipedrive). As notas continuam visíveis apenas na aba **Notas**.

### 2. Restaurar a barra de etapas (estilo "slides")

Substituir o bloco `Stage selector` (linhas ~210–231) por uma barra de progresso clicável:

- Container `flex items-end gap-1` ocupando a largura do header.
- Para cada etapa, um `<button>` `flex-1`:
  - Barra fina `h-1.5 rounded-full`, preenchida com `s.cor` quando `idx <= currentStageIdx`, e `bg-white/5` quando ainda não atingida.
  - A etapa **ativa** ganha um leve glow/realce (ex.: `ring-1` na cor da etapa + `shadow`).
  - Label `text-[10px]` abaixo, truncado, destacado quando ativo.
  - Click chama o `handleStageChange(s.id)` existente.
  - `title` com "Mover para {nome}" para affordance.
- Manter o badge "X dias no estágio atual" como está.

Sem mexer em hooks, dados ou lógica de mutação — apenas markup/estilo do seletor e do histórico.

## Fora de escopo

- Não tocar em `useDealNotes`, RLS, schema, ou na aba **Notas**.
- Não alterar atividades, e-mail, files, sidebar do deal, ou o restante da página.
