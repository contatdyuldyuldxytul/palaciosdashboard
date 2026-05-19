## Diagnóstico — o que está consumindo o disco IO

Mapeei as fontes principais de pressão no banco:

1. **Sem `staleTime` global no React Query** — toda navegação entre páginas refaz `SELECT *` em `leads`, `lancamentos`, `crm_*`, `clientes_ativos`, `metas_*`, etc. Em tabs como Dashboard / CEO isso dispara 10+ queries simultâneas a cada foco da janela.
2. **`useSyncSheets`** roda **a cada 5 min** e ao final chama `queryClient.invalidateQueries()` **sem chave** → invalida **todas** as queries do app → tempestade de SELECTs no Supabase.
3. **`usePalaciosData`** chama `useLancamentos(mes)` **e** `useLancamentos()` (sem filtro). O segundo puxa a tabela inteira mas o resultado nem é usado.
4. **`useCrmDeals`** faz `SELECT * + joins (organizations, persons)` com `LIMIT 2000` toda vez que o pipeline monta, **e** abre realtime `postgres_changes` em `crm_deals` por pipeline.
5. **Realtime extra**: `useColaboradorStats` e `TeamMemberDashboard` assinam `meeting_checks` (canal duplicado por dashboard aberto). Realtime mantém replicação WAL ativa, contribuindo bastante para disk IO.
6. **`useFunnelAnalysis`** dispara edge function a cada **30 min** via `setInterval`, mesmo com a aba inativa.
7. **`useLeads`** puxa `*` da tabela inteira sem `staleTime`, usado em ~10 lugares.
8. **Faltam índices** em colunas usadas em filtro/ordem: `lancamentos(mes, data)`, `crm_deals(pipeline_id, updated_at)`, `meeting_checks(colaborador, mes)`, `leads(data_criacao)`.

## Plano de otimização (somente front-end + 1 migration de índices)

### 1. Defaults globais do QueryClient (`src/App.tsx`)
Configurar:
- `staleTime: 5 * 60_000` (5 min) — dados ficam "fresh" entre navegações.
- `gcTime: 30 * 60_000`.
- `refetchOnWindowFocus: false`, `refetchOnReconnect: false`, `retry: 1`.

Impacto: corta a maior parte dos refetchs redundantes.

### 2. Corrigir `useSyncSheets`
- Aumentar `SYNC_INTERVAL_MS` de **5 min → 30 min**.
- Pausar o intervalo quando `document.hidden` (não sincronizar com aba em segundo plano).
- Trocar `queryClient.invalidateQueries()` global por invalidação **direcionada** apenas às queries afetadas pela sync (ex.: `["lancamentos"]`, `["leads"]`, `["clientes_ativos"]`, `["balanco"]`, `["fluxo_caixa"]`, `["custos_config"]`).

### 3. `usePalaciosData`
- Remover a chamada redundante `useLancamentos()` (sem filtro).
- Manter apenas `useLancamentos(mes)`.

### 4. `useCrmDeals`
- Reduzir `LIMIT` de 2000 → 500 e ordenar por `updated_at`.
- Remover o `select` aninhado de `organizations` e `persons`; buscar essas tabelas uma vez via hooks próprios cacheados (`useCrmOrganizations`, `useCrmPersons`) com `staleTime: 10min` e fazer o join em memória.
- Remover a subscrição realtime em `crm_deals` — substituir por `staleTime: 60_000` + refetch manual após mutations (já invalida via `onSuccess`).

### 5. Realtime `meeting_checks`
- Remover assinaturas em `useColaboradorStats` e `TeamMemberDashboard`.
- Substituir por `useQuery` com `staleTime: 2min` + invalidação explícita após o usuário marcar uma reunião (já fazemos isso na mutation).

### 6. `useFunnelAnalysis`
- Remover o `setInterval` de 30 min. Manter só o fetch inicial + botão "atualizar análise" (`refresh`) já exposto.

### 7. `useLeads`
- Adicionar `staleTime: 5 * 60_000` (alinha com o default mas explicito).
- Onde só precisamos contagem/agregação (TickerBar, CeoMetricsAndAlerts), trocar `select("*")` por `select("id,status,responsavel_nome,valor_estimado,data_criacao,data_fechamento")`.

### 8. Migration — índices (única alteração no banco)
```sql
CREATE INDEX IF NOT EXISTS idx_lancamentos_mes      ON public.lancamentos (mes);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data     ON public.lancamentos (data DESC);
CREATE INDEX IF NOT EXISTS idx_crm_deals_pipeline   ON public.crm_deals (pipeline_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_checks_colab ON public.meeting_checks (colaborador, mes);
CREATE INDEX IF NOT EXISTS idx_leads_data_criacao   ON public.leads (data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_crm_acts_deal        ON public.crm_activities (deal_id, scheduled_at);
```

## Fora de escopo
- Nada de alteração em layout/UX, autenticação, lógica de negócio, comissões, metas, ou cálculo financeiro.
- Sem mudança em edge functions (sync-sheets, sync-pipedrive permanecem como estão).
- Sem alterar a sincronização do Pipedrive (já roda a cada 2h, ok).

## Resultado esperado
- Redução drástica de SELECTs disparados por refocus de aba e por sincronização automática.
- Menos pressão de WAL/replicação ao remover assinaturas realtime de tabelas muito ativas.
- Queries que sobram passam a usar índices apropriados → menos IO por query.

Se aprovar, eu aplico tudo isso em um único passo de implementação.