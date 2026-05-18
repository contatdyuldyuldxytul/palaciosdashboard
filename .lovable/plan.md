## Foco: Design do CRM nativo

Vamos priorizar o **visual e UX do CRM** agora. A importação dos deals do Pipedrive fica para depois — trabalharemos com dados mock/seed enquanto refinamos a interface.

## Escopo desta etapa

### 1. Seed de dados realistas (mock)
Inserir dados fictícios consistentes nas tabelas `crm_pipelines`, `crm_stages`, `crm_deals`, `crm_persons`, `crm_organizations`, `crm_activities` para que o design seja testado com volume real:
- 3 pipelines (ex: ALFA, BETA, Pós-venda)
- 6–8 stages por pipeline com cores
- ~40 deals distribuídos entre stages, com valores, owners, datas
- Pessoas/orgs vinculadas e algumas atividades agendadas

### 2. Refinamento visual do Kanban (`/crm`)
- Header premium com seletor de pipeline (pill tabs ou dropdown elegante), busca, filtros (owner, valor, data), toggle Kanban/Lista
- Cards de deal com glassmorphism: nome, organização, valor (R$), owner avatar, tags de stage, indicador de inatividade, próxima atividade
- Colunas com soma total, contagem de deals, cor sutil do stage no topo
- Drag-and-drop com feedback visual (sombra, escala, drop zones)
- Empty states ilustrados, skeletons no loading
- Animações de entrada (framer-motion)

### 3. Refinamento da Lista (`/crm` toggle)
- Tabela densa com colunas configuráveis: deal, org, valor, stage, owner, próxima atividade, dias parado
- Linha hover com ações rápidas
- Filtros e busca compartilhados com o Kanban
- Ordenação por coluna

### 4. Detalhe do Deal (`/crm/deal/:id`) — esqueleto visual
Página com layout finalizado mas ainda sem todas as integrações:
- Header com nome, valor, stage atual (pipeline visual de progresso), owner, ações (Ganho/Perdido/Editar)
- Sidebar direita: organização, pessoas vinculadas, campos custom
- Tabs principais: **Timeline | Notas | Atividades | Histórico**
- Visual cumprindo o padrão glassmorphism dark da plataforma

### 5. Modal "Novo Deal" refinado
- Multi-step ou single elegante: pipeline → stage → nome → org/pessoa → valor → owner → data esperada
- Validação visual, autocomplete em org/pessoa

### 6. Botão "Importar do Pipedrive" mantido
Disponível para o fundador no header, mas **não acionado agora**. Fica pronto para quando você quiser puxar os dados.

## Não está nesta etapa
- Importação real do Pipedrive
- Edição completa de deal (write-back, mudança de stage via API)
- Atividades CRUD completo / calendário integrado
- Gestão de pessoas e organizações (CRUD)
- Permissões RLS refinadas por owner

Essas fases vêm depois, sobre a base visual aprovada.

## Pergunta antes de seguir

Confirma se posso **inserir dados mock** no banco para popular o design (eles serão apagados ou substituídos quando importarmos o Pipedrive)?
