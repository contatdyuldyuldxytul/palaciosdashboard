## Objetivo

Eliminar a senha repetida do Painel CEO e substituir por controle de acesso baseado em login. Apenas o seu usuário (Cristine) terá a role `fundador` e, portanto, acesso ao `/ceo`.

## Situação atual

- O projeto já tem autenticação completa (`AuthContext`, Supabase Auth, tabelas `profiles` e `user_roles` com enum `app_role` = `fundador` | `vendedor`).
- A rota `/ceo` já está protegida por `<ProtectedRoute requireRole="fundador">` — isso sozinho já bastaria.
- O incômodo vem do `CeoLayout.tsx`, que adiciona um **segundo** gate por PIN (`Cristine#1972#`) toda vez que você entra. É redundante com o login.
- O mesmo PIN também aparece em `PasswordGate` usado em `/clientes` e `/hunter`.

## Plano

### 1. Remover o gate de PIN do Painel CEO
Em `src/layouts/CeoLayout.tsx`:
- Apagar todo o estado `unlocked / pin / error`, a função `handleSubmit`, o bloco JSX da tela de senha e a constante `CEO_PASSWORD`.
- Apagar imports não usados (`useState`, `Lock`, `motion`, `AnimatePresence`).
- O componente vira apenas a barra de navegação + `<Outlet />`.
- A proteção continua sendo a `<ProtectedRoute requireRole="fundador">` já existente em `App.tsx`.

### 2. Garantir que só você tem a role `fundador`
Não há como saber pelo código quais usuários já existem. Preciso confirmar com você (ver pergunta abaixo) e então:
- Rodar uma migration / insert que garanta a role `fundador` apenas para o seu `user_id` em `public.user_roles`.
- Opcionalmente, remover qualquer outra linha `fundador` que exista hoje.

### 3. Registro de logins no Supabase (auditoria)
Criar tabela nova `public.login_events`:

```text
id            uuid pk
user_id       uuid (referência a auth.users)
email         text
logged_in_at  timestamptz default now()
user_agent    text
```

- RLS: só `fundador` pode ler (`SELECT`); qualquer authenticated pode inserir o **próprio** registro (`auth.uid() = user_id`).
- Em `AuthContext`, no callback `onAuthStateChange` quando o evento for `SIGNED_IN`, inserir uma linha em `login_events` com o `user_id`, email e `navigator.userAgent`.
- Isso te dá histórico de "quem entrou e quando" diretamente no banco.

### 4. (Opcional) Visualizar os logins dentro do Painel CEO
Posso adicionar uma pequena aba/seção "Acessos" listando os últimos logins. Não vou fazer isso a não ser que você peça — a menos que você confirme na pergunta abaixo.

### 5. Demais gates de PIN (`/clientes`, `/hunter`)
Por enquanto **não vou mexer**. O pedido é específico do CEO. Se quiser que eu retire também, é só dizer.

## Detalhes técnicos

- Arquivos alterados: `src/layouts/CeoLayout.tsx` (limpeza) e `src/contexts/AuthContext.tsx` (insert em login_events).
- Migration nova: criação de `login_events` + RLS.
- Sem alterações em `App.tsx` (a guarda por role já está lá).
- Sem alterações no `PasswordGate` (continua existindo para outras rotas).

## Preciso de confirmação sua antes de executar

1. Qual é o **email** da sua conta de fundador hoje? (Para garantir/forçar a role `fundador` somente nele.)
2. Quer que eu adicione uma aba "Acessos" no Painel CEO mostrando o histórico de logins? (sim / não)
3. Quer que eu também retire o PIN das áreas `/clientes` e `/hunter`, deixando só o login decidir o acesso? (sim / não)
