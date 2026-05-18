## Objetivo
Transformar o CRM em uma página standalone com layout próprio (sem sidebar nem ticker do app principal), mantendo a mesma janela do navegador.

## Mudanças

### 1. Novo layout dedicado `src/layouts/CrmLayout.tsx`
- Fundo escuro com a mesma cena animada glassmorphism (`glass-bg-scene`, partículas) para manter consistência visual.
- **Header próprio minimalista** (sticky top, altura ~56px, glass-card border-bottom):
  - Esquerda: logo Palacios (ícone + wordmark) + separador + título "CRM Integrado".
  - Centro/direita: link "← Voltar ao app" (navega para `/`) + toggle de tema + avatar/nome do usuário logado.
- `<Outlet />` para renderizar as páginas filhas em tela cheia (max-w livre, padding generoso).

### 2. Reestruturar rotas em `src/App.tsx`
- Tirar `/crm` e `/crm/deal/:id` de dentro do `AppLayout`.
- Criar uma nova árvore de rotas irmã, ainda protegida por `ProtectedRoute`, usando `CrmLayout`:
  ```text
  <Route element={<ProtectedRoute><CrmLayout /></ProtectedRoute>}>
    <Route path="/crm" element={<Crm />} />
    <Route path="/crm/deal/:id" element={<CrmDealDetail />} />
  </Route>
  ```

### 3. Ajustes em `src/components/AppSidebar.tsx`
- O item "CRM" continua na sidebar do app principal, mas a navegação leva para `/crm` que agora renderiza o layout próprio (mesma janela, experiência separada).
- O destaque "ativo" não vai mais aparecer porque o usuário sai do `AppLayout` — comportamento esperado.

### 4. Ajustes visuais em `src/pages/Crm.tsx` e `src/pages/CrmDealDetail.tsx`
- Remover o título "CRM" do header da página (já está no header do layout) e manter apenas o subtítulo + ações (pipeline tabs, KPIs, view toggle, botões).
- Aumentar o padding lateral para aproveitar a tela cheia (sem a sidebar de 56px–224px).

## Não escopo
- Não mexe em lógica de dados, hooks do CRM, edge functions ou banco.
- Não abre em nova aba do navegador (decisão do usuário: mesma janela).
- Outras páginas do app continuam idênticas.

## Resultado
Clicar em **CRM** na sidebar do app principal leva o usuário a uma experiência standalone em tela cheia, com header próprio e botão "Voltar ao app" para retornar ao Dashboard.