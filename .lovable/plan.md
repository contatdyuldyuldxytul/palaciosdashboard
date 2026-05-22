## Objetivo
Reformular `src/pages/CrmDealDetail.tsx` para que ao abrir qualquer lead seja possível editar tudo inline, mudar etapa clicando na barra, criar atividades/notas direto na página, e ver dados estruturados conforme as imagens de referência.

## Mudanças no banco (migration)

Para suportar todos os campos pedidos faltam colunas e uma tabela de etiquetas:

**`crm_deals`** – adicionar:
- `probabilidade` int (0–100)
- `label_ids` uuid[] (array de etiquetas)

**`crm_persons`** – adicionar:
- `first_name`, `last_name`, `linkedin` text

**`crm_organizations`** – adicionar:
- `endereco`, `num_colaboradores` (int), `porte`, `faturamento` (numeric), `instagram`, `linkedin`, `whatsapp` text

**Nova tabela `crm_labels`** (etiquetas personalizáveis por todos):
- `id`, `nome`, `cor` (hex), `created_at`
- RLS: SELECT para todos autenticados; INSERT/UPDATE/DELETE para autenticados
- Seed com as etiquetas da imagem 2 (FALHOU A LIGAÇÃO, CONTINUAR O FLUXO NORMALMENTE, LIGAR DEPOIS, WHATSAPP, NÚMERO PASSADO PARA O DECISOR, NÃO PODE ATENDER, PRÉ LANÇAMENTO, THIAGO, CONTATO POR EMAIL SOMENTE, ALINE)

## Nova UI – `CrmDealDetail.tsx`

### 1. Cabeçalho (topo)
- Título editável inline (clique → input).
- Valor editável inline (clique → input numérico R$).
- Barra de etapas do funil **clicável**: cada bolinha/segmento dispara `useMoveDealStage` para mudar a stage instantaneamente, com highlight da atual.
- Botões "Marcar como Ganho/Perdido/Editar" mantidos.

### 2. Coluna principal (tabs)
Tabs: **Atividades | Notas** (remover "Timeline" e "Histórico" como abas).

- **Aba Atividades**:
  - Botão "+ Nova Atividade" abre um **formulário inline embaixo do botão** (não modal), inspirado na imagem 1: input título, tipo (ícones Call/Email/Tarefa/Reunião…), data, hora início/fim, descrição, responsável, "Mark as done", botões Salvar/Cancelar.
  - Lista de atividades existentes abaixo, com checkbox para concluir.

- **Aba Notas**:
  - Textarea + botão "Adicionar nota".
  - Lista cronológica de notas salvas (autor + data + conteúdo).

- **Histórico** (sempre visível, abaixo das tabs, não é uma aba): linha do tempo com mudanças de stage, criação, atividades concluídas, notas adicionadas — lendo de `crm_deal_history` + `crm_notes` + `crm_activities`.

### 3. Sidebar direita (cards, nesta ordem)

**Sumário**
- Valor (editável)
- Empresa (autocomplete em `crm_organizations`)
- Contato/Decisor (autocomplete em `crm_persons`)
- Etiquetas (multi-select com chips coloridos; popover lista as labels de `crm_labels` + botão "+ Add label" que cria uma nova com cor escolhida)
- Deal probability (slider 0–100%)
- Expected close date (datepicker)

**Dados do Lead** (do `crm_persons` ligado; mostra "–" se vazio)
- Telefone, Email, First name, Last name, Cargo, LinkedIn

**Dados da Empresa** (do `crm_organizations` ligado; mostra "–" se vazio)
- Nome, Endereço, Website, Nº Colaboradores, Porte, Faturamento, Instagram, LinkedIn, WhatsApp

**Responsável**
- Select com colaboradores aprovados (hook existente `useCollaborators`) → grava `owner_user_id` + `owner_label`.

**Datas**
- Criado em, Entrou no estágio atual, Fechamento esperado (mantido).

Todos os campos editáveis usam pattern "click-to-edit" com auto-save (debounce ~500ms) via mutations novas em `useCrm.ts`:
- `useUpdateDeal`, `useUpdatePerson`, `useUpdateOrganization`, `useCreateNote`, `useCreateActivity`, `useToggleActivity`, `useCrmLabels`, `useCreateLabel`, `useSetDealLabels`.

## Arquivos

- **Migration**: cria colunas + tabela `crm_labels` + seed.
- **`src/hooks/useCrm.ts`**: adiciona os novos hooks e tipos.
- **`src/pages/CrmDealDetail.tsx`**: reescrito conforme acima.
- Pequenos componentes auxiliares dentro do mesmo arquivo (InlineField, LabelPicker, ActivityInlineForm, StageBar).

## Fora do escopo
- Não alterar Kanban, listas, ou outras rotas.
- Não trazer abas Email/Files/Documents/Invoice da imagem 1 (só o formulário "Activity" inline).
