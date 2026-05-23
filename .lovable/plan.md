## Problema 1 — Fluxos não salvam

O `useUpdateFlow` faz `update().eq()` **sem `.select()`**. Quando o RLS bloqueia (ou nenhuma linha bate), o Supabase retorna sucesso silencioso (0 linhas afetadas, sem erro). Resultado: o toast "Fluxo salvo" aparece mas nada persiste.

A política atual de `flows` é:
- `flows_view` → qualquer autenticado pode ler
- `flows_manage` → **somente `fundador`** pode inserir/atualizar/deletar

Quem está logado provavelmente não tem o papel `fundador` para o contexto de Deals (ou a sessão precisa ser revalidada), então o update é descartado em silêncio.

### Correção

1. **`src/hooks/useFlows.ts`** — em `useUpdateFlow`, trocar para:
   ```ts
   .update(patch).eq("id", id).select("id")
   ```
   e lançar erro explícito se `data.length === 0` ("Sem permissão para salvar este fluxo ou linha não encontrada"). Mesma proteção em `useDeleteFlow`.

2. **Nova migration** — relaxar `flows_manage` para qualquer usuário autenticado (consistente com `flows_view`, já que toda a área de Projects/Deals já é interna):
   ```sql
   DROP POLICY "flows_manage" ON public.flows;
   CREATE POLICY "flows_manage" ON public.flows
     FOR ALL TO authenticated USING (true) WITH CHECK (true);
   ```
   Mesmo tratamento para `flow_runs` se estiver com restrição parecida.

3. **`FlowEditor.tsx`** — após `update.mutateAsync`, dar `await` em uma re-leitura via `queryClient.invalidateQueries` (já existe no hook) e mostrar toast de erro real vindo do throw acima.

## Problema 2 — Faltam tipos de node, especialmente um node "livre"

Hoje só temos: trigger, email, whatsapp, delay, condition, update. Vou adicionar nodes **não-automatizados** (visuais/organizacionais), úteis para desenhar o processo mesmo sem rodar nada:

### Novos nodes

| Node | Função | Config no inspetor |
|---|---|---|
| **Custom** (em branco) | Node livre totalmente personalizável | Ícone (picker com ~30 ícones lucide), cor (color picker), título, descrição/markdown curto |
| **Note** (sticky) | Bloco de anotação amarelo, sem handles obrigatórios | Texto multilinha |
| **Milestone** | Marco visual (bandeira) | Título, data opcional |
| **Decision** | Pergunta/decisão humana com 2 saídas (Sim/Não) | Pergunta, label saída A, label saída B |
| **Task** | Tarefa manual atribuída a alguém | Título, responsável (texto livre por enquanto), prazo opcional |
| **Webhook** | Chamada HTTP genérica (já fica preparado, sem executar agora) | URL, método, payload JSON |

### Implementação em `FlowEditor.tsx`

1. **Expandir `NODE_META`** com as 6 entradas acima (ícone padrão + cor padrão).
2. **`FlowNode`** — quando `data.kind === "custom"`, renderizar usando `data.icon` (string lucide) e `data.color` (hex) salvos em `data`, com fallback. Para `note`, esconder handles ou deixá-los discretos.
3. **`NodeInspector`** — novos blocos:
   - `custom`: 
     - **Icon picker**: grade 6×N com ~30 ícones (Star, Heart, Flag, Target, Lightbulb, Rocket, Bell, Bookmark, Camera, FileText, Folder, Image, Layers, Link, Map, MessageSquare, Music, Package, Phone, Settings, Shield, ShoppingCart, Tag, Timer, Tool/Wrench, User, Users, Video, Zap, CheckCircle). Salva em `data.icon`.
     - **Color picker**: 8 swatches (emerald, blue, violet, pink, amber, red, cyan, slate) + input hex livre. Salva em `data.color`.
     - **Descrição**: textarea livre. Salva em `data.config.description`.
   - `note`: textarea ampla.
   - `milestone`: título + input date.
   - `decision`: pergunta + 2 labels (atualizar handles `yes`/`no` no node).
   - `task`: título + responsável + due date.
   - `webhook`: url + select método + textarea payload.
4. **Palette lateral** — adicionar os 6 novos botões em uma seção "Personalizado" separada da seção "Automação" (cabeçalho `text-[10px] uppercase`).
5. **Mapa de ícones dinâmico** para o custom node — importar os 30 ícones e expor via `CUSTOM_ICONS: Record<string, LucideIcon>`.

## Arquivos a editar/criar

- `src/hooks/useFlows.ts` — `.select()` + erro explícito em update/delete.
- `supabase/migrations/<nova>.sql` — relaxar policy `flows_manage`.
- `src/components/crm/projects/FlowEditor.tsx` — novos nodes, novo renderer condicional, inspetores, palette agrupada, mapa de ícones.

## Fora de escopo

- Execução real dos novos nodes (webhook, task, decision) — ficam só visuais/configuráveis por enquanto. A lógica de runtime continua só nos nodes de automação existentes.
- Mudar quem pode ver/editar fluxos por escopo (deals vs projects) — segue compartilhado entre autenticados.
