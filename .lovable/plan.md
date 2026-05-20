## Objetivo
Substituir o placeholder da rota `/crm/instagram` pela estrutura base da página "Leads do Instagram", já consultando a tabela `leads_qualified` (quando existir), com estados de loading, vazio e erro.

## Mudanças

### 1. Criar componente `src/pages/crm/InstagramLeads.tsx`
- Cabeçalho com título "Leads do Instagram" e subtítulo "Prospecção qualificada por IA de escritórios de arquitetura e incorporadoras".
- Hook `useInstagramLeads()` com `useQuery` do TanStack Query fazendo `select` em `leads_qualified` filtrando `status = 'aguardando_revisao'` e ordenando por `score` decrescente.
- Campos exibidos: `username`, `score`, `tipo_lead`, `razao`, `mensagem_rascunho`, `processado_em`.
- Grid de cards (1 col mobile, 2 tablet, 3 desktop). Cada card usa `.glass-card` seguindo o design system do projeto.
- Estados:
  - **Loading**: skeleton pulse no estilo já usado em `Crm.tsx` (glass-card animado).
  - **Vazio**: ícone + texto "Nenhum lead aguardando revisão".
  - **Erro**: mensagem de erro amigável.

### 2. Atualizar `src/App.tsx`
- Substituir `<Placeholder title="Leads do Instagram" />` pela importação e uso do novo `<InstagramLeads />` na rota `/crm/instagram`.

## Fora de escopo
- Filtros, abas, botões de ação (aprovar/rejeitar), estatísticas do topo, modal de detalhes, botão "Gerar leads".
- Criação da tabela `leads_qualified` no banco (o usuário configurará o Supabase depois).

## Estilo
- Segue o glassmorphism do projeto: `glass-card`, `--glass-border`, `--primary` (emerald `#00C896` para scores altos quando aplicável).
- Ícones do Lucide (Instagram, User, MessageSquare, Clock).
