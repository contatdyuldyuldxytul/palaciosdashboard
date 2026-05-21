## CRM Completo — Plano

Transformar `/crm` num CRM totalmente funcional, com gestão de pipelines, busca, importação de dados, colunas visualmente destacadas e tipos de fluxo configuráveis.

---

### 1. Gestão de Pipelines (criar / editar / deletar)

Novo botão **"Gerenciar Pipelines"** ao lado dos pills no topo, abrindo um modal com:

- Lista de pipelines existentes (renomear, reordenar, ativar/desativar, deletar).
- Botão **"Novo Pipeline"** abre um formulário com:
  - **Nome** do pipeline
  - **Tipo de Fluxo** (select): `Fluxo de Cadência 10 Dias`, `Fluxo de Nutrição`, `Fluxo de Vendas`, `Fluxo Personalizado`
  - **Responsável** (assign): select populado com colaboradores ativos (lidos da tabela `profiles` — mesma fonte usada no painel CEO).
  - **Etapas iniciais**: editor inline para adicionar/remover/renomear etapas com cor; se for "Cadência 10 Dias" auto-popula com etapas pré-definidas.

Em cada pipeline existente, ícone de lápis abre o mesmo editor para editar nome, tipo, responsável e etapas (CRUD sobre `crm_stages`).

### 2. Tipo de Fluxo (preparado para configuração futura)

- Novo enum `pipeline_flow_type` e coluna `flow_type` em `crm_pipelines`.
- Nova coluna `owner_user_id` (uuid) e `owner_label` (text) em `crm_pipelines` para o assign.
- A configuração detalhada de cada tipo (regras, automações) virá depois na futura aba **Configurações** — agora apenas registramos o tipo + UI básica.

### 3. Barra de Busca

Acima do board, input de busca (ícone lupa) que filtra deals em tempo real por:
- Título do deal
- Nome da organização
- Nome / email da pessoa
- Valor

Filtra tanto Kanban quanto Lista. Mantém atalho `⌘K` / `Ctrl+K`.

### 4. Importar CSV / Sync Google Sheets

Botão **"Importar"** (dropdown) com 2 opções:

- **Importar CSV**: modal com upload, preview das primeiras linhas, mapeamento de colunas (Título, Valor, Organização, Pessoa, Email, Telefone, Etapa, Responsável). Insere via `crm_deals` + cria/reaproveita `crm_organizations` e `crm_persons`.
- **Sincronizar Google Sheets**: campo para URL/ID da planilha + aba. Usa a edge function existente `sync-sheets` (estendida com um endpoint `crm-deals`) ou nova função `import-crm-sheets`. Salva o ID da planilha no pipeline para re-sync manual.

### 5. Colunas do Kanban demarcadas

Refator visual em `KanbanBoard.tsx` / `StageColumn`:

- Cada etapa vira um **container glass** semi-transparente (`bg-white/[0.03]`, `border border-white/8`, `backdrop-blur-xl`, `rounded-2xl`) envolvendo header **e** lista de cards.
- Top border colorida (3px) usando `stage.cor`.
- Header sticky dentro da coluna.
- Padding interno consistente, drop zone destacada com `ring-2 ring-primary/40` em hover.
- Background sutil com gradiente vertical da cor da etapa (5% → 0%) para reforçar identidade.

---

### Detalhes técnicos

**Migração (a aprovar):**
```sql
CREATE TYPE pipeline_flow_type AS ENUM
  ('cadencia_10_dias','nutricao','vendas','personalizado');

ALTER TABLE crm_pipelines
  ADD COLUMN flow_type pipeline_flow_type NOT NULL DEFAULT 'personalizado',
  ADD COLUMN owner_user_id uuid REFERENCES auth.users(id),
  ADD COLUMN owner_label text,
  ADD COLUMN sheet_id text,
  ADD COLUMN sheet_tab text;
```

**Novos arquivos:**
- `src/components/crm/PipelineManagerModal.tsx` (lista + CRUD)
- `src/components/crm/PipelineEditorModal.tsx` (form criar/editar + editor de etapas)
- `src/components/crm/ImportCsvModal.tsx`
- `src/components/crm/ImportSheetsModal.tsx`
- `src/components/crm/CrmSearchBar.tsx`
- `supabase/functions/import-crm-sheets/index.ts`

**Atualizados:**
- `src/hooks/useCrm.ts` — hooks `useCreatePipeline`, `useUpdatePipeline`, `useDeletePipeline`, `useUpdateStages`, `useCollaborators`, `useImportCrmCsv`, `useSyncCrmSheets`.
- `src/components/crm/KanbanBoard.tsx` — redesenho das colunas.
- `src/pages/Crm.tsx` — busca, dropdown Importar, botão Gerenciar Pipelines.

**Templates de etapas por tipo de fluxo** (pré-popular ao criar):
- Cadência 10 Dias: `Dia 1 – Contato`, `Dia 3 – Follow-up`, `Dia 5 – Material`, `Dia 7 – Call`, `Dia 10 – Decisão`
- Nutrição: `Frio`, `Engajado`, `Quente`, `Pronto p/ Vendas`
- Vendas: `Lead`, `Qualificado`, `Proposta`, `Negociação`, `Ganho`, `Perdido`
- Personalizado: vazio (usuário define)

---

### Ordem de implementação

1. Migração (tipos + colunas em `crm_pipelines`)
2. Hooks CRUD em `useCrm.ts` + hook de colaboradores
3. `PipelineEditorModal` + `PipelineManagerModal`
4. Redesenho visual das colunas do Kanban
5. Barra de busca + filtragem
6. `ImportCsvModal` (client-side parse com PapaParse)
7. Edge function + `ImportSheetsModal`

Pronto pra implementar — confirma e vou em frente?