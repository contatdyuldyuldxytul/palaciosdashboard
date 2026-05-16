## Objetivo

Reformular completamente a aba **Clientes** dentro do CEO: limpar os 3 clientes existentes, criar um cadastro estruturado com parcelas configuráveis e checklist de serviços, fazer match automático com pagamentos da planilha financeira, e adicionar fluxo de "Projeto concluído" → seção de projetos anteriores.

---

## 1. Limpeza inicial

Deletar do banco apenas estes clientes (e seus dados ligados: checklist_projetos, financeiro_clientes):
- BKV Dsign
- Bolognesi Cenário
- Bolognesi - Essenza

---

## 2. Estrutura de dados (schema)

**Estender `clientes_ativos`** com novos campos:
- `parcelas` (jsonb) — array `[{ numero, percentual, dias_apos_inicio, data_prevista, status: 'pendente'|'pago', valor_pago, data_pagamento, match_descricao }]`
- `tem_imagens` (bool), `qtd_imagens` (já existe)
- `tem_animacao` (bool), `segundos_animacao` (já existe)
- `tem_tour_virtual` (bool), `valor_tour_virtual` (numeric)
- `servicos_adicionais` (text), `valor_servicos_adicionais` (numeric)
- `tem_software` (bool), `plano_software` (enum text: 'Prata' | 'Ouro' | 'Diamante')
- `concluido_em` (timestamptz, null = ativo)
- `apelidos` (text[]) — usado pelo match automático (ex: `['Arcko', 'ARK']`)

Status: `ativo` (default) e `concluido` (quando `concluido_em` preenchido).

---

## 3. Tela: Cadastro de cliente (modal)

Design compacto, 1 coluna em mobile, 2 em desktop. Stepper visual leve (3 seções dentro do mesmo modal scrollável, não wizard intrusivo):

**Seção A — Dados do projeto**
- Nome do projeto (text)
- Empresa/Cliente (text)
- Valor geral do contrato (R$)
- Data de início

**Seção B — Parcelas** (gera dinamicamente)
- Input "Quantas parcelas?" (1–12)
- Para cada parcela renderiza um card mini:
  - % da parcela (com validação: soma das % = 100%)
  - Dias após início → mostra abaixo "Vence em DD/MM/YYYY" (calc auto)
  - Mostra valor R$ correspondente
- Botão "distribuir igualmente" como atalho

**Seção C — Checklist de serviços** (cada item = checkbox que revela um campo)
- ☐ Imagens → input quantidade
- ☐ Animação → input segundos
- ☐ Tour virtual → input valor R$
- ☐ Serviços adicionais → textarea descrição + valor R$
- ☐ Software → select Prata/Ouro/Diamante

**Seção D — Apelidos para match** (collapsible "Avançado")
- Tags input com chips (preenchido automático com o nome da empresa; user pode adicionar variações)

Botão "Salvar cliente".

---

## 4. Match automático com planilha (Entradas e Saídas)

Criar hook `useParcelaMatcher`:
- Lê `lancamentos` onde `classificacao = 'Entrada'` e categoria ∈ ('Receitas Palacios', 'Receitas BKV').
- Para cada cliente ativo, percorre suas `parcelas` ainda `pendente` e busca lançamento cuja `descricao` contenha qualquer um dos `apelidos` do cliente **E** contenha a `%` da parcela (ex: "20%") ou o valor exato.
- Match encontrado → marca `status: 'pago'`, grava `valor_pago`, `data_pagamento` (= `data` do lançamento), `match_descricao`.
- Não-match com confiança ambígua → exibe um banner "X pagamentos sem cliente identificado" com botão "Atribuir manualmente" → dropdown com lista de clientes e parcelas em aberto.

Roda automaticamente ao abrir a página e após cada sync financeiro.

---

## 5. Tela: Lista e detalhe do cliente

**`/ceo/clientes` (ativos)** — grid de cards mostrando:
- Nome do projeto, empresa
- Barra de progresso financeiro: `valor_pago / valor_total`
- Mini-timeline de parcelas (pontinhos: ✓ pago, ◯ pendente, ⚠ atrasada)
- Botão "Ver detalhes" → modal com:
  - Tabela completa de parcelas (status, vencimento, pagamento, descrição matched)
  - Checklist de serviços
  - Botão **"Marcar projeto como concluído"** → confirm dialog → seta `concluido_em = now()` → some da lista ativa.

**`/ceo/clientes/anteriores`** — mesma estrutura, somente leitura, lista clientes com `concluido_em IS NOT NULL`. Mostra data de conclusão e total faturado.

Tabs no topo: "Ativos" | "Anteriores" | "+ Novo Cliente".

---

## 6. Design

Mantém o padrão CEO (glassmorphism dark + acento amber/gold). Modal de cadastro com seções colapsáveis para não ficar overwhelming. Checklist usa toggles suaves estilo iOS. Parcelas em cards horizontais scrolláveis quando 4+.

---

## Detalhes técnicos

- **Migração 1**: ALTER TABLE `clientes_ativos` adicionar colunas listadas. Default `parcelas = '[]'::jsonb`, `apelidos = '{}'::text[]`.
- **Migração 2**: DELETE dos 3 clientes (via insert tool, não migração).
- **Hook novo**: `useClientesCEO.ts` (separado do `useClientes` para não impactar a rota antiga `/clientes`).
- **Componentes novos**:
  - `src/pages/ceo/CeoClientesAtivos.tsx`
  - `src/pages/ceo/CeoClientesAnteriores.tsx`
  - `src/components/ceo/ClienteFormModal.tsx`
  - `src/components/ceo/ClienteDetalhesModal.tsx`
  - `src/components/ceo/ParcelasEditor.tsx`
- **Layout**: criar `CeoClientesLayout.tsx` com tabs Ativos/Anteriores.
- **Roteamento**: substituir rota atual `/ceo/clientes` por esse layout (rota antiga `/clientes` para vendedores permanece intacta).
- **Match**: lógica regex `/\b(\d{1,3})\s*%/` para extrair percentual + `.includes(apelido)` case-insensitive.
- **Memória**: atualizar `mem://features/project-tracking` refletindo nova estrutura.

---

## Fora de escopo (nesta entrega)

- Edição de cliente após criação (só visualização + marcar concluído). Posso adicionar depois se quiser.
- Notificações de parcela atrasada.
- Upload de contratos/arquivos.