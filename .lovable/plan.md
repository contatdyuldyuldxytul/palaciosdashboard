## Objetivo
Tornar a plataforma totalmente usável no celular sem mexer no desktop. Tudo abaixo de `md` (768px) ganha um novo shell de navegação e cada página principal recebe ajustes responsivos. Desktop continua idêntico ao atual.

## 1. Shell de navegação mobile

**`AppLayout.tsx`** (detecta `useIsMobile`)
- Desktop: layout atual (sidebar fixa + ticker + outlet).
- Mobile:
  - Sidebar lateral é escondida (`hidden md:flex`).
  - Header superior fixo (h-12): botão hambúrguer (esquerda) + logo central + ação contextual (direita, ex: sync/notificações).
  - `TickerBar` continua, mas em fonte menor e com scroll horizontal.
  - `<main>` ganha `pb-20` para não ficar atrás da bottom bar.
  - Novo componente **`MobileBottomNav`** fixo embaixo (safe-area inset).
  - Novo componente **`MobileDrawer`** (usa `Sheet` do shadcn) que reaproveita o conteúdo do `AppSidebar` para itens secundários.

**`MobileBottomNav.tsx`** (novo)
- 5 abas fixas: Dashboard, CRM, Hunter, Assistente, **Mais**.
- "Mais" abre o `MobileDrawer` (CEO, Configurações, tema, logout, sub-itens do CRM).
- Visual: glassmorphism dark, ícone + label minúsculo, ativo com glow primary (`#00C896`).
- Respeita `env(safe-area-inset-bottom)` para iPhone.

**`MobileDrawer.tsx`** (novo)
- `Sheet side="left"` com a lista completa de navegação (igual sidebar atual), incluindo sub-itens do CRM, CEO (se fundador), tema, perfil e logout.

**Sub-navegação do CRM no mobile**
- Quando rota começa com `/crm`, mostrar uma sub-barra horizontal scrollable (chips) logo abaixo do header, com os sub-itens (Deals, Projects, Atividades, E-mail, etc.) — substitui a árvore da sidebar que some no mobile.

## 2. Kanban com swipe (CRM + Projects)

Aplica-se a `KanbanBoard.tsx` (CRM) e `ProjectsKanban.tsx` (Projects).

- Desktop: comportamento atual (várias colunas lado a lado, scroll horizontal).
- Mobile (`useIsMobile`): renderizar **uma coluna por tela** usando `embla-carousel-react` (já presente via shadcn `carousel`).
  - Cada slide = 1 stage em largura `100%` (com padding lateral).
  - Indicador superior: dots + nome da etapa atual + contador (ex: "3 de 6 · Qualificação").
  - Setas/swipe horizontais para navegar entre etapas.
  - Cards do kanban ocupam largura cheia, padding maior, fonte legível.
  - Drag-and-drop entre etapas continua disponível via long-press → menu "Mover para…" (mais confiável no touch que arrasto cross-slide).

## 3. Ajustes responsivos por página

Para todas as páginas listadas abaixo, regra geral:
- Padding `p-3` no mobile (vs `p-6` desktop).
- Títulos: `text-lg` mobile / `text-2xl` desktop.
- Grids `grid-cols-2 md:grid-cols-4`, KPI cards mais compactos.
- Tabs/SectionTabs com scroll horizontal (`overflow-x-auto`) quando excedem largura.
- Tabelas (DealListView, lançamentos, etc.) viram **lista de cards** no mobile.
- Modais (`Dialog`) viram `Sheet side="bottom"` no mobile com altura `90vh`.

Páginas tocadas:
- `Dashboard.tsx` — empilhar painéis, KPIs 2x2.
- `Crm.tsx` — header em coluna, KPIs 2x2, kanban com swipe.
- `crm/Projects.tsx` — tabs como chips scrollable, kanban com swipe.
- `crm/Atividades.tsx` (NucleoOperacional) — seletor de colaborador em scroll horizontal já está ok, ajustar dashboards internos (TeamMemberDashboard, LdrMemberDashboard, ThiagoDashboard) para grid 1-col.
- `crm/Email.tsx` — InboxView vira navegação em 3 níveis (Folders → Threads → Message) com botão "voltar" em vez das 3 colunas lado a lado. Composer vira sheet bottom.
- `crm/InstagramLeads.tsx` — listas verticais.
- `Funil.tsx` — etapas empilhadas.
- `Leads.tsx` / `HunterNegocios.tsx` / `ClientesAtivos.tsx` / `Comissoes.tsx` / `Metas.tsx` / `Estrategias.tsx` / `Financeiro.tsx` / `Scripts.tsx` / `AssistenteFundador.tsx` / `AssistenteGeral.tsx` / `AssistenteVendas.tsx` — padding/grid/tabela revistos.
- `CrmDealDetail.tsx` — colunas viram abas no mobile.
- **CEO** (`CeoLayout.tsx` + páginas `ceo/*`) — sub-navegação financeira como chips scrollable; tabelas DRE/Balanço/Fluxo viram cards expansíveis; mantém tema dark/gold.
- `TeamMemberDashboard.tsx`, `LdrMemberDashboard.tsx`, `ThiagoDashboard.tsx` — KPIs 2x2, gráficos full-width.

## 4. CSS global

**`src/index.css`**
- Adicionar utilitários: `.safe-bottom { padding-bottom: env(safe-area-inset-bottom); }`, `.safe-top`.
- Reduzir `body` font-size hierarchy no mobile via media query.
- Aurora background fica `opacity-50` no mobile para não competir com o conteúdo denso.
- Garantir que `glass-card` mantém leitura (`backdrop-blur` reduzido para perf no mobile).

## 5. Detalhes técnicos

- Hook `useIsMobile()` já existe (`src/hooks/use-mobile.tsx`, breakpoint 768).
- Drawer/Sheet → `@/components/ui/sheet` (já instalado).
- Carousel → `@/components/ui/carousel` (Embla, já instalado).
- Sem novas dependências.
- Sem mudanças em backend, edge functions ou rotas — puramente apresentação.
- Desktop (`md:` e acima) permanece pixel-idêntico ao atual.

## Arquivos a criar
- `src/components/mobile/MobileBottomNav.tsx`
- `src/components/mobile/MobileDrawer.tsx`
- `src/components/mobile/MobileHeader.tsx`
- `src/components/mobile/MobileCrmSubnav.tsx`
- `src/components/mobile/SwipeableKanban.tsx` (wrapper reusável)

## Arquivos a editar (principais)
- `src/layouts/AppLayout.tsx`, `src/layouts/CeoLayout.tsx`
- `src/components/AppSidebar.tsx` (esconder no mobile, exportar lista pra reutilizar)
- `src/components/TickerBar.tsx`
- `src/components/crm/KanbanBoard.tsx`, `src/components/crm/projects/ProjectsKanban.tsx`
- `src/components/crm/DealListView.tsx`
- `src/components/crm/email/InboxView.tsx`, `Composer.tsx`
- `src/pages/Crm.tsx`, `src/pages/crm/Projects.tsx`, `src/pages/crm/Email.tsx`, `src/pages/crm/Atividades.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Funil.tsx`, `src/pages/CrmDealDetail.tsx`, `src/pages/ceo/*`, dashboards de colaborador
- `src/index.css`

## Validação
- Testar em viewport 375x812 (iPhone), 430x932 (iPhone Pro Max) e 768x1024 (iPad).
- Confirmar que desktop ≥1024 está visualmente idêntico ao atual.
- Smoke test em cada rota principal.
