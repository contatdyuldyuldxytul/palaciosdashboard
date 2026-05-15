## Ajustes finais antes de ativar o sync

Dry-run validou que a planilha é lida (78 lançamentos: 73 da aba Entrada e Saídas + 5 do Salário Thiago). Mas duas correções no parser são necessárias antes de sincronizar de verdade.

### 1. Corrigir coluna de data (Entrada e Saídas)
- Hoje o parser pega a primeira coluna cujo header contém "data" → caiu na **coluna B** que está vazia → tudo virou data de hoje.
- Você confirmou que **as datas estão na coluna C**.
- **Fix**: forçar `colData = 2` (coluna C) na função `parseEntradaSaidas`, em vez do auto-detect por header. Mantém auto-detect só se col C não existir (defensivo).

### 2. Manter linha 51 como "Salário Thiago" (já está correto)
- Linha 51 da aba Orçamento é rotulada "Despesas Totais", mas você confirmou que **isso representa o pró-labore do Thiago**.
- Parser já está lendo somente as 12 colunas Realizado e gravando como `categoria=Pessoas, subcategoria=Pró-labore, descricao=Salário Thiago`.
- Nada a mudar.

### 3. Cron de 12 em 12h
- Agendar via `pg_cron` + `pg_net` chamando `sync-financeiro-sheets` às **00h e 12h** todo dia (`0 0,12 * * *`).
- Inserido com `supabase--insert` (dado sensível: URL e anon key).

### 4. Botão "Sincronizar planilha financeira" no CEO Financeiro
- Header de `CeoFinanceiro.tsx`: botão chamando `supabase.functions.invoke("sync-financeiro-sheets")`.
- Indicador "Última sync: HH:MM" ao lado, com hook leve `useFinanceiroSync` (espelho simples do `useSyncSheets`, sem auto-sync porque o cron cuida disso).
- Toast de sucesso/erro mostrando contagem (`73 lançamentos + 5 salário`).
- Após sync ok, invalida queries `useFinanceiro` para recarregar UI.

### 5. Rodar sync real (não-dryRun) uma vez
- Após deploy, chamar a function sem `?dryRun=1` para popular `financeiro_empresa` pela 1ª vez.
- Verificar contagem no banco com `read_query`.

### Arquivos afetados
- `supabase/functions/sync-financeiro-sheets/index.ts` — fix coluna de data
- `src/hooks/useFinanceiroSync.ts` — novo hook
- `src/pages/ceo/CeoFinanceiro.tsx` — botão + indicador
- Cron via SQL (não cria arquivo de migration)

### O que **não** vou fazer
- Não vou mexer no schema da tabela `financeiro_empresa` (já tem todas as colunas).
- Não vou tocar nos lançamentos manuais existentes — só apago os com `notas IN ('sync:entradas-saidas', 'sync:orcamento-salario-thiago')` antes de reinserir.
