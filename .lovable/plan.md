# Plano: Acelerar o Palacios OS

O app está lento principalmente por **três causas estruturais** que identifiquei no código. Abaixo o diagnóstico e o plano de ação, em ordem de impacto.

## Diagnóstico

**1. Bundle gigante carregado de uma vez** (`src/App.tsx`)
- Hoje todas as ~50 páginas são importadas no topo do `App.tsx` (Dashboard, CEO, CRM, Clientes, Financeiro, Assistentes, etc). O usuário baixa tudo no primeiro load, mesmo para abrir só uma tela.

**2. Auto-sync pesado rodando em background**
- `useSyncSheets` dispara sincronização do Google Sheets a cada **30 min** (10+ abas, milhares de linhas) — invalida 11 query keys de uma vez, forçando re-render em cascata.
- `usePipedrive` dispara sync a cada **2h** chamando a edge function `sync-pipedrive` (pesada, com risco de 429).
- Esses syncs concorrem com a navegação e travam a UI quando disparam.

**3. Queries sem cache adequado / re-fetch excessivo**
- Vários hooks (`useLeads`, `useLancamentos`, `useClientesCEO`, etc.) provavelmente não respeitam o `staleTime` global de 5 min porque são invalidados em massa pelos syncs.
- `useParcelaMatcher` roda um `useMemo` pesado (loop O(n×m) com regex por descrição) e ainda dispara `supabase.update` em paralelo — toda vez que muda lançamento ou cliente.

## Plano de ação (4 frentes)

### Frente 1 — Code splitting por rota (impacto alto, risco baixo)
- Converter os imports de páginas em `App.tsx` para `React.lazy(() => import(...))`.
- Envolver `<Routes>` em `<Suspense fallback={<LoadingScreen />}>`.
- Manter eager apenas: `Login`, `Dashboard`, `AppLayout`, `ProtectedRoute`.
- Resultado esperado: bundle inicial cai 60–80%, first paint muito mais rápido.

### Frente 2 — Reduzir trabalho em background
- `useSyncSheets`: aumentar intervalo de **30 min → 2 h**, e só rodar quando `document.visibilityState === "visible"` E última sync > 2h (já tem o gate de visibility, falta o gate de tempo).
- `usePipedrive`: aumentar `staleTime` de 60s → 10 min, manter auto-sync de 2h mas pular se aba escondida.
- Invalidação granular: em vez de invalidar 11 keys de uma vez no sync-sheets, invalidar só as keys das abas que efetivamente vieram com `success: true` e `count > 0`.

### Frente 3 — Otimizar `useParcelaMatcher`
- Pré-computar o mapa de aliases uma vez (fora do loop).
- Só persistir no Supabase quando o usuário estiver na tela de CEO/Clientes (mover o `update` para um hook explícito `useSyncParcelas` que roda sob demanda, não dentro do `useMemo`).

### Frente 4 — React Query Devtools off + ajustes finos
- Confirmar `refetchOnMount: false` onde fizer sentido (dashboards que não precisam de dado fresco a cada navegação).
- Verificar se o `QueryClient` está com `gcTime: 30min` (já está) e considerar `persistQueryClient` no localStorage para sobreviver a refresh.

## Detalhes técnicos

```text
Arquivos afetados:
  src/App.tsx                    → lazy + Suspense
  src/hooks/useSyncSheets.ts     → intervalo + gate de tempo
  src/hooks/usePipedrive.ts      → staleTime + visibility gate
  src/hooks/useParcelaMatcher.ts → separar match de persistência
```

Nenhuma mudança visual, nenhuma mudança de funcionalidade — só performance.

## O que NÃO está incluído

- Trocar de provider de hosting / aumentar instância do Lovable Cloud (posso sugerir depois se mesmo com isso continuar lento).
- Refatorar componentes específicos (Dashboard, CEO) — faria em uma 2ª rodada se necessário.

## Próximo passo

Quer que eu execute as 4 frentes de uma vez, ou prefere começar só pela **Frente 1 (code splitting)** que já costuma resolver 70% da percepção de lentidão?
