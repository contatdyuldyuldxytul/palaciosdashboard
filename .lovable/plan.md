## Aba Contatos — lista unificada com filtros e painel lateral

Substituir o placeholder de `/crm/contatos` por uma página real que unifica todos os contatos da base e permite navegar pelos detalhes sem trocar de rota.

### Fontes de dados
- `crm_persons` (nome, empresa via `crm_organizations`, cargo, telefone, email)
- `clientes_ativos` (para marcar quem é cliente ativo / ex-cliente; casamento por email, depois por nome)
- `crm_deals` (para detectar leads quentes e ex-clientes via deals ganhos/abertos/perdidos)
- `crm_activities` (atividades recentes no painel lateral)

### Derivação do badge de status
Cada contato ganha 1 de 4 status, calculado no client com cores distintas:

```text
Cliente Ativo   → emerald   (clientes_ativos.status = 'ativo')
Ex-Cliente      → sky       (clientes_ativos.status != 'ativo' OU já teve deal 'won' sem projeto ativo)
Lead            → amber     (algum crm_deals com status = 'open')
Prospect Frio   → muted     (nenhum deal aberto, nenhum vínculo de cliente)
```

### Layout

```text
┌─ Header: título + busca global ──────────────────────────────┐
│  [🔍 buscar por nome, empresa, email, telefone, cargo...]   │
├─ Filtros (chips) ────────────────────────────────────────────┤
│  Status ▾   Empresa ▾   Cargo ▾   (combináveis, live)        │
├─ Tabela ─────────────────────────────────────────────────────┤
│  Nome | Empresa | Cargo | Telefone | E-mail | [Badge status] │
│  ... (linhas clicáveis, hover destaca)                       │
└──────────────────────────────────────────────────────────────┘

Sheet lateral (Radix Sheet, abre da direita, ~480px):
  • Header: avatar inicial + nome + badge status
  • Bloco "Contato": empresa, cargo, telefone, email, links sociais
  • Bloco "Negociações": lista de crm_deals vinculados (titulo, stage, valor, status)
  • Bloco "Últimas atividades": crm_activities ordenadas desc (tipo, título, data)
  • Botão "Abrir no CRM" leva ao deal mais recente
```

### Componentes / arquivos

- **`src/pages/crm/Contatos.tsx`** (novo) — página principal, monta hook, filtros, tabela e sheet
- **`src/components/crm/contatos/ContactRow.tsx`** (novo) — linha da tabela
- **`src/components/crm/contatos/ContactDetailSheet.tsx`** (novo) — painel lateral usando `Sheet` do shadcn
- **`src/components/crm/contatos/ContactStatusBadge.tsx`** (novo) — badge com cores por status
- **`src/hooks/useContatos.ts`** (novo) — query React Query que junta `crm_persons` + `crm_organizations` + agrega `crm_deals` + `clientes_ativos` e devolve `Contato[]` enriquecido com status derivado
- **`src/App.tsx`** — trocar `Placeholder` por `Contatos` na rota `/crm/contatos`

### Detalhes técnicos

- Tudo client-side (3-4 selects do Supabase em paralelo, união em memória). Volume atual da base é pequeno.
- Filtros e busca usam `useMemo` sobre a lista carregada; sem round-trips extras.
- Selects de filtro (Status/Empresa/Cargo) são alimentados a partir dos valores únicos da própria lista.
- Estilo segue o padrão glassmorphism premium do projeto (cards `glass-card`, `border-white/10`, semantic tokens), pt-BR para labels.
- Sheet lateral fecha com ESC / clique fora; navegação dentro da aba sem mudar de rota.

### Fora do escopo
- Criar/editar contatos (somente leitura nesta primeira versão)
- Merge/dedup automático entre `crm_persons` e `clientes_ativos` (apenas matching por email/nome para o badge)
- Exportação CSV
