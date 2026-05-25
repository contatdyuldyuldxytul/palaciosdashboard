
## Objetivo
Criar uma nova seção **Geração de Leads** no sidebar (logo abaixo de "E-mail") que agrupe três fontes de prospecção hoje espalhadas pelo app:
1. **Leads do Instagram** (hoje em `/crm/instagram`)
2. **Histórico Pipedrive** (hoje como aba interna da dashboard da Milena em `/equipe/milena`)
3. **Hunter de Negócios** (hoje em `/hunter`)

## Estrutura de navegação

```text
Sidebar
├── E-mail
├── Geração de Leads        ← NOVO item
│   ├── Instagram
│   ├── Pipedrive
│   └── Hunter
├── Contatos
└── ...
```

A página `/crm/geracao-leads` segue o mesmo padrão de `/crm/atividades`: usa `<SectionTabs>` no topo e renderiza rotas filhas via `<Outlet />`.

Rotas:
- `/crm/geracao-leads` → redirect para `/crm/geracao-leads/instagram`
- `/crm/geracao-leads/instagram` → componente atual de `InstagramLeads`
- `/crm/geracao-leads/pipedrive` → componente `HistoricoPipedrive`
- `/crm/geracao-leads/hunter` → componente `HunterNegocios` (mantendo o `PasswordGate` para não‑fundadores)

## Mudanças por arquivo

### `src/pages/crm/GeracaoLeads.tsx` (novo)
Página container espelhando `src/pages/crm/Atividades.tsx`: 3 tabs (Instagram, Pipedrive, Hunter) + `<Outlet />`.

### `src/App.tsx`
- Adicionar rotas filhas em `/crm/geracao-leads` com os 3 componentes.
- Trocar `/crm/instagram` e `/hunter` por `<Navigate replace>` para os novos caminhos (mantém retrocompatibilidade de URLs antigas).
- Manter `HunterGate` (PasswordGate para não‑fundadores) embrulhando a rota nova.

### `src/components/AppSidebar.tsx`
- Substituir os itens "Leads Instagram" e "Hunter de Negócios" por um único item **"Geração de Leads"** (ícone `Sparkles` ou `Radar`), posicionado logo abaixo de "E-mail".
- Remover entrada solta de Hunter da lista principal.

### `src/components/mobile/MobileCrmSubnav.tsx`
- Substituir "Instagram" por "Geração" apontando para `/crm/geracao-leads`.

### `src/components/mobile/MobileBottomNav.tsx`
- Atualizar o tab "Hunter" para apontar para `/crm/geracao-leads/hunter` (ou substituir por "Leads"). Mantém atalho rápido.

### `src/pages/LdrMemberDashboard.tsx`
- Remover a aba **Histórico Pipedrive** (e o bloco `{activeTab === "historico" && <HistoricoPipedrive />}`).
- Adicionar um link discreto "Ver no CRM → Geração de Leads / Pipedrive" para preservar acesso a partir do painel da Milena.

## Fora do escopo
- Não alterar a lógica interna de `InstagramLeads`, `HistoricoPipedrive` ou `HunterNegocios`.
- Não mexer no `PasswordGate` do Hunter — a proteção continua.
- Sem mudanças de schema/DB.
