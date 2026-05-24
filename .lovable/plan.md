## Objetivo
Adicionar seleção múltipla e ações em massa na visão de Lista em Deals (CRM), para editar vários leads de uma vez.

## Mudanças

### `src/components/crm/DealListView.tsx`
- Adicionar coluna de checkbox no início da tabela (header com "selecionar todos visíveis" + linha por deal).
- Estado `selectedIds: Set<string>` controlando seleção.
- Quando há ≥1 selecionado, exibir **barra de ações fixa** acima da tabela (substituindo o contador da direita), com:
  - Texto "N selecionados · R$ X"
  - Botão **Mover de funil/estágio** → abre Popover com `PipelineSwitcher` + `Select` de estágio do funil escolhido. Confirma e dispara `useUpdateDeal` (ou bulk) para cada deal.
  - Botão **Marcar como Ganho / Perdido** → atualiza `status` em massa (Perdido pede `motivo_perda` via prompt simples).
  - Botão **Reatribuir responsável** → Popover com lista (Aline/Milena/Felipe/Thiago) → atualiza `owner_label`.
  - Botão **Enviar email** → abre `Composer` (de `@/components/crm/email/Composer`) pré-populado com os e-mails dos `person` vinculados (separados por vírgula). Se algum deal não tiver e-mail, mostra aviso com contagem.
  - Botão **Excluir** (vermelho) → `AlertDialog` de confirmação → deleta em massa via `supabase.from("crm_deals").delete().in("id", ids)` e invalida queries.
  - Botão "Limpar seleção".
- Todas as mutações usam `Promise.all` + `useQueryClient().invalidateQueries(["crm_deals"])` ao final, com `toast` de sucesso/erro.
- Manter filtros, busca e o resto da tabela inalterados.

### `src/hooks/useCrm.ts` (apenas se necessário)
- Verificar se já existem hooks `useUpdateDeal` / `useDeleteDeal`. Se sim, reutilizar. Se não houver bulk, fazer as N chamadas no componente mesmo (volume baixo, é admin).

## Detalhes técnicos
- Usar `Checkbox` de `@/components/ui/checkbox`, `Popover`, `AlertDialog`, `DropdownMenu` já existentes.
- Seleção persiste apenas durante a sessão da view; ao filtrar, manter IDs selecionados mas exibir checkbox marcado só nos visíveis.
- Barra de ações com classes glassmorphism existentes (`glass-card`, borda `border-white/10`).
- Sem alterações de schema no banco — apenas updates/deletes via cliente Supabase respeitando as RLS atuais (`crm_deals_update`, `crm_deals_delete` — note que delete exige role `fundador`).

## Fora de escopo
- Edição inline de campos (valor, título) — pode vir depois se desejar.
- Importação/exportação em massa.
