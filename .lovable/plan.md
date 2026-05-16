## O que vamos fazer

### 1. Editar clientes cadastrados
- Reaproveitar o `ClienteFormModal` como modal de criação **e** edição (prop opcional `cliente?: ClienteCEO`).
- Pré-preencher todos os campos quando vier um cliente.
- Adicionar botão **"Editar"** no `ClienteDetalhesModal` (ao lado de "Marcar como concluído") que abre o form em modo edição.
- Hook `useUpdateClienteCEO` já existe; criar `useUpsertClienteCEO` wrapper que decide entre insert/update.

### 2. Opção "Recorrente" no cadastro
- Novo toggle "Cliente recorrente" no topo do form.
- Quando ativo, **oculta**: valor total, data de início, parcelas, serviços. Mostra apenas:
  - Nome da empresa
  - Nome do projeto/serviço
  - Apelidos (importantíssimo p/ match)
- Salvo com `valor_total = 0`, `parcelas = []`, novo campo `recorrente boolean`.
- Card e detalhes mostram badge "Recorrente" + soma de tudo que entrou (em vez de % pago).
- Migração: adicionar coluna `recorrente boolean default false` e `vendedor_id uuid` em `clientes_ativos`.

### 3. Vendedor + comissão de 4%
- Novo campo no form: **"Vendedor responsável"** (select com profiles que têm `vendedor_sub_role` ou lista fixa Aline/Milena/Thiago).
- Salvo em `clientes_ativos.vendedor_id`.
- Comissão = 4% × soma de **pagamentos recebidos** (parcelas pagas + entradas matched p/ recorrentes) do vendedor no mês.
- Novo hook `useComissaoVendedor(userId, mes)` que:
  - Busca clientes onde `vendedor_id = userId`
  - Soma `valor_pago` das parcelas com `data_pagamento` no mês (clientes normais)
  - Soma `lancamentos` matched aos apelidos dos clientes recorrentes do vendedor no mês
  - Retorna `{ totalRecebido, comissao: total * 0.04 }`
- Exibir bloco **"Comissão de projetos (4%)"** dentro do perfil/dashboard do vendedor (`TeamMemberDashboard.tsx` e `LdrMemberDashboard.tsx`) junto do salário fixo existente.

### 4. Corrigir dados de pagamento (matcher)
**Causa raiz** (verificada nos dados):
- O matcher faz fallback **"primeira parcela pendente"** quando não acha % nem valor. Isso atribui aleatoriamente pagamentos a parcelas erradas (ex: Bolognesi tem 6 pagamentos mensais reais mas só 4 parcelas configuradas; sobras viram ruído).
- "BKV" (9 lançamentos) não tem cliente cadastrado → todos batem no fallback ou ficam unmatched.
- Apelidos genéricos ("Cenário") colidem entre Bolognesi e "Bolognesi - Essenza".
- Margem de 5% no value-match é frouxa em valores baixos.

**Correções:**
- **Remover fallback "primeira pendente"**. Match só acontece se: (a) % explícito bater, ou (b) valor bater dentro de ±2%.
- **Pular clientes recorrentes** na lógica de marcar parcela (eles só agregam soma).
- Match de apelido passa a exigir **token boundary** (regex `\b<apelido>\b`) p/ evitar sobreposição.
- Quando múltiplos clientes batem o apelido, escolher o **mais específico** (apelido mais longo) — resolve Bolognesi vs Bolognesi - Essenza.
- Antes de gravar, **resetar parcelas para `pendente`** e remontar do zero a cada execução, para evitar matches antigos persistidos errados.

### 5. Remover banner "X pagamentos na planilha sem cliente identificado"
- Apagar o bloco condicional em `CeoClientes.tsx` (linhas 76-92) e o cálculo `unmatched` exposto. Manter só `matchedCount` no subtítulo.

## Mudanças por arquivo

```text
supabase/migrations/<new>.sql          ALTER TABLE clientes_ativos
                                         ADD recorrente boolean default false,
                                         ADD vendedor_id uuid;
src/hooks/useClientesCEO.ts            + campos recorrente, vendedor_id na interface
                                       + useUpsertClienteCEO
src/hooks/useParcelaMatcher.ts         reescrever: sem fallback, reset parcelas,
                                       skip recorrentes, apelido com word boundary,
                                       escolha do match mais específico
src/hooks/useComissaoVendedor.ts       NOVO
src/components/ceo/ClienteFormModal.tsx
                                       + prop cliente?, toggle Recorrente,
                                       + select Vendedor, pré-preenchimento
src/components/ceo/ClienteDetalhesModal.tsx
                                       + botão Editar, badge Recorrente,
                                       + nome do vendedor + comissão acumulada
src/pages/ceo/CeoClientes.tsx          remover banner unmatched
src/pages/TeamMemberDashboard.tsx      bloco "Comissão de projetos (4%)"
src/pages/LdrMemberDashboard.tsx       idem
```

## Fora de escopo
- Reconfigurar lógica de comissão antiga (`localStorage` em `/comissoes`) — segue como está.
- Mudar a estrutura de salário fixo.
- UI para vincular manualmente pagamento ↔ cliente (matcher fica 100% automático com regras mais estritas).

Confirma que posso seguir assim?