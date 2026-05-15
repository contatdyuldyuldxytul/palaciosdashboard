## Objetivo
Ler automaticamente a planilha financeira do Thiago e popular o dashboard apenas com os dados da **Palacios 3D Studio**, separando o que é PF do que é PJ, e tratando o "Salário Thiago" como item especial extraído do Orçamento.

## ⚠️ Pré-requisito importante
A URL fornecida (`...rtpof=true&sd=true`) indica que o arquivo é um **Excel (.xlsx) hospedado no Drive**, não uma planilha Google nativa. A Google Sheets API **não consegue ler .xlsx diretamente**. Antes do sync funcionar, precisamos de **uma das duas opções**:

- **Opção A (recomendada):** abrir no Drive → *Arquivo → Salvar como Planilhas Google*. Gera um novo link `docs.google.com/spreadsheets/...` nativo. Mais simples e rápido.
- **Opção B:** baixar via Drive API e converter no edge function com biblioteca xlsx. Mais código, mais frágil, mas mantém o arquivo .xlsx.

Vou seguir com a **Opção A** no plano. Se preferir B, me avise.

A conta Google já conectada (`GOOGLE_SERVICE_ACCOUNT_JSON`) precisa ter acesso de leitura à planilha — basta compartilhar com o e-mail da service account.

## Fontes na planilha

**Aba `Entrada e Saídas`** — fonte primária dos lançamentos
- Filtrar linhas onde a coluna `Categoria` termina com (ou contém) `- P3DS`
- Cada linha vira um registro em `financeiro_empresa` (data, descrição, categoria, valor, tipo entrada/saída)

**Aba `Orçamento`** — fonte do "Salário Thiago"
- Linha 51, somente coluna `Realizado` de cada mês
- Estrutura: a cada 2 colunas começa um mês novo (par Projetado/Realizado)
- Para cada mês com valor preenchido, cria 1 lançamento em `financeiro_empresa`:
  - tipo: `despesa`
  - categoria: `Pessoas`
  - subcategoria: `Pró-labore`
  - descricao: `Salário Thiago`
  - data: dia 1 do mês correspondente
  - valor: valor da célula

## Sincronização
- Frequência: **a cada 12h** via `pg_cron` + `pg_net` chamando a edge function
- Estratégia anti-duplicata: limpar (`DELETE`) os lançamentos do tipo "sync planilha" antes de reinserir, marcando origem em `notas` (ex: `notas = 'sync:orçamento'` e `notas = 'sync:entradas-saidas'`). Mantém intactos lançamentos manuais antigos.
- Sync manual: botão no header do CEO Financeiro chamando a mesma function

## Implementação técnica

1. **Nova edge function `sync-financeiro-sheets`** (`supabase/functions/sync-financeiro-sheets/index.ts`)
   - Auth: service account já existente (`GOOGLE_SERVICE_ACCOUNT_JSON`)
   - Lê secret novo `FINANCEIRO_SHEETS_ID` (separado do `GOOGLE_SHEETS_ID` atual, que é da operação comercial)
   - Faz `values:batchGet` em `Entrada e Saídas!A:Z` e `Orçamento!A51:ZZ51` (header de meses em `Orçamento!1:1` para identificar colunas Realizado)
   - Filtra linhas P3DS, parseia Salário Thiago coluna a coluna
   - Faz upsert em `financeiro_empresa`

2. **Migration**
   - Nenhuma alteração de schema; `financeiro_empresa` já tem os campos necessários
   - Apenas o cron job (via tool `supabase--insert`):
     ```sql
     select cron.schedule('sync-financeiro-12h','0 */12 * * *', $$ select net.http_post(...) $$);
     ```

3. **Frontend**
   - Botão "Sincronizar planilha financeira" em `CeoFinanceiro.tsx` (header)
   - Indicador da última sync (similar ao `SyncIndicator.tsx`)
   - Banner informativo se sync falhar (categoria não encontrada, planilha movida etc.)

4. **Secret novo**
   - `FINANCEIRO_SHEETS_ID` — ID da planilha (parte entre `/d/` e `/edit`)

## O que vou pedir/fazer ao implementar
1. Você converte para Planilhas Google nativa (Opção A) e compartilha com o e-mail da service account com permissão de leitor.
2. Você me passa o **novo ID** da planilha convertida → adiciono como secret.
3. Eu crio a edge function, migration do cron, botão no CEO e indicador de sync.
4. Rodamos manualmente uma vez juntos para validar o parsing e ajustar (especialmente identificar exatamente onde está a coluna "Realizado" de cada mês — a regra "a cada 2 colunas = mês novo" precisa de uma linha de header pra ancorar).

## Pergunta final antes de implementar
Preciso confirmar: **a primeira coluna de mês começa em qual coluna do `Orçamento`?** (Ex: B/C = Janeiro Projetado/Realizado, D/E = Fevereiro Projetado/Realizado…). Se for esse padrão, fica trivial; se não for, leio a linha 1 da aba para mapear.
