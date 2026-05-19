## Objetivo
Integrar todo o CRM ao app principal: eliminar a janela/layout separados do CRM e mostrar suas 9 páginas como sub-abas fixas (sempre visíveis, sem precisar expandir) abaixo do item "CRM" no `AppSidebar`, no mesmo padrão visual usado por "Vendas".

## Mudanças

### 1. `src/components/AppSidebar.tsx`
- Remover `isExternal: true` do item CRM (não abre mais em nova área).
- Adicionar lista de sub-itens do CRM com os 9 destinos:
  - Deals → `/crm`
  - Projects → `/crm/projects`
  - Atividades → `/crm/atividades`
  - E-mail → `/crm/email`
  - Leads Instagram → `/crm/instagram`
  - Contatos → `/crm/contatos`
  - Insights & Forecast → `/crm/insights`
  - Automações I.A → `/crm/automacoes`
  - Configurações → `/crm/configuracoes`
- Renderizar essas sub-abas SEMPRE que a sidebar não estiver `collapsed` (não condicionar a `active`), usando o mesmo bloco visual de filhos já existente (linha divisória à esquerda + ícone Lucide pequeno em vez de avatar).
- Marcar a sub-aba ativa via `location.pathname` (Deals usa match exato em `/crm`).
- Remover o ícone `ExternalLink` ao lado de CRM.

### 2. `src/App.tsx`
- Mover as 9 rotas `/crm/*` (incluindo `/crm/deal/:id`) para dentro do bloco `<Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>`.
- Remover o bloco standalone com `<CrmLayout />` e o import correspondente.

### 3. `src/layouts/CrmLayout.tsx`
- Excluir (não é mais usado).

## Fora de escopo
Conteúdo das páginas placeholder, lógica de deals, queries, autenticação, comissões.
