## Correção da query em `PlanoSemanalClaude.tsx`

### Mudanças no `load()`
1. Manter `(supabase as any).from("weekly_plans")` (já está assim).
2. Remover qualquer filtro extra — apenas `.select("*").order("created_at", { ascending: false }).limit(1).maybeSingle()`.
3. Capturar `{ data, error }` e adicionar:
   ```ts
   console.log("[PlanoSemanalClaude] weekly_plans result:", { data, error });
   ```
4. Se `error` existir, logar `console.error` e `setPlan(null)` para sair do estado de loading.

### Verificação de RLS
A tabela `weekly_plans` já tem a policy `wp_view` com `USING (true)` para `authenticated`. Isso significa:
- Se o usuário **não estiver autenticado** (role `anon`), a query retorna vazio sem erro.
- O console.log vai confirmar isso (`data: null, error: null`).

Se o log mostrar `data: null` sem erro, o problema é que o componente está sendo renderizado sem sessão autenticada. Nesse caso, proponho adicionar uma policy SELECT para `anon` também (ou confirmar que a página exige login antes de montar o componente).

### Nenhuma outra alteração
Manter intacto: defaults de cadência, distribuição, UI, estilos.
