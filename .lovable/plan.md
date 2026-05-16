## Usuários já logados na plataforma

Encontrei 5 contas que já acessaram. Use isso para mapear cada vendedor ao e-mail dele:

| Nome no perfil | E-mail | Último login | Role atual |
|---|---|---|---|
| Thiago Palacios | contato@palacios3dstudio.com | 16/05 12:21 | fundador (você) |
| Thiago Palacios | titopalaciosg5@gmail.com | 16/05 12:11 | — |
| Aline Fonseca | aline@palacios3dstudio.com | 15/05 18:52 | — |
| Milena Palacios | milepalaciosg5@gmail.com | nunca | — |
| milena | milena.medsouza@gmail.com | nunca | — |

Felipe ainda não criou conta. Na nova aba você vai conseguir associar cada e-mail ao colaborador (Aline-BDR, Milena-LDR, Thiago, Felipe) e aprovar/rejeitar acessos.

---

## 1. Sistema de aprovação de acesso (novo)

Hoje qualquer pessoa que cria conta entra direto. Mudança:
- Nova coluna `status` em `profiles`: `pending` (default) | `approved` | `rejected`.
- Quem está `pending` é bloqueado no `ProtectedRoute` e vê uma tela "Aguardando aprovação do CEO".
- Os 5 e-mails atuais ficam `approved` automaticamente na migration (para não te trancar fora).
- Apenas fundador pode aprovar/rejeitar pela nova aba.

## 2. Vínculo colaborador ↔ e-mail

Hoje a tabela `colaborador` é um texto fixo ("Aline", "Milena", "Thiago", "Felipe") espalhado pelo app. Vou adicionar em `profiles`:
- `colaborador_slug`: `aline` | `milena` | `thiago` | `felipe` | null
- `sub_role`: `bdr` | `ldr` | `cs` | `ceo` | null (texto livre, você define)

A aba Colaboradores deixa você escolher o slug de cada e-mail aprovado. Isso conecta a conta logada aos dados existentes (metas, comissões, clientes) sem precisar migrar nada.

## 3. Privacidade salário/comissão (RLS)

Cada vendedor só vê o próprio salário + comissão:
- Helper SQL `get_my_colaborador_slug()` (security definer).
- Policy nova em `comissoes`: SELECT permitido se `has_role('fundador')` OU `vendedor_id = auth.uid()`.
- Nas páginas `TeamMemberDashboard` (Aline/Felipe), `LdrMemberDashboard` (Milena), `ThiagoDashboard`: bloquear acesso se o `colaborador_slug` do usuário logado ≠ slug da rota (e usuário não for fundador). Mostra tela "Sem permissão".
- Hunter de Negócios: remover `PasswordGate` para fundador, manter senha para os outros (ou bloquear direto — recomendo bloquear direto para vendedor, sem senha).

## 4. Corrigir assign de vendedor nos clientes

O bug atual: `useVendedores()` faz `SELECT * FROM profiles`, mas o RLS de `profiles` só permite ver o **próprio** perfil. Resultado: o dropdown só mostrava você. Correção:
- Nova policy: `Fundador can view all profiles`.
- `useVendedores()` filtra por `colaborador_slug IS NOT NULL AND status = 'approved'`.
- Garante que Aline, Milena, Thiago, Felipe apareçam no select de "Vendedor responsável" do cliente.

## 5. Nova aba CEO → Colaboradores

Rota: `/ceo/colaboradores`. Cards (um por colaborador: Thiago, Aline, Milena, Felipe):
- Avatar + nome + sub_role (BDR/LDR/CS/CEO)
- **E-mail vinculado** + status (Aprovado/Pendente/Sem conta)
- **% da meta do mês** (reusa `useMetasMensais` + dados de reuniões/contratos por colaborador)
- **Salário fixo + Comissão acumulada** (reusa `useComissaoVendedorByName`)
- **Posição no ranking** (1º–4º por % da meta)

Painel lateral: lista de "Solicitações de acesso pendentes" com botões Aprovar / Rejeitar / Atribuir colaborador.

## 6. Itens técnicos resumidos

- Migration: colunas em `profiles` (status, colaborador_slug, sub_role) + policies novas em `profiles` e `comissoes` + função `get_my_colaborador_slug`.
- Auto-aprovar os 5 e-mails existentes; setar slug do Thiago = `thiago`, role já é fundador.
- Novo componente: `src/pages/ceo/CeoColaboradores.tsx`.
- Atualizar `CeoLayout` (item de menu), `App.tsx` (rota), `ProtectedRoute` (checar status), `useVendedores` (filtro), `HunterNegocios` route (sem senha para fundador), dashboards individuais (lock por slug).

---

## Perguntas antes de executar

1. Quero confirmar o mapeamento dos e-mails:
   - `contato@palacios3dstudio.com` → **Thiago (CEO/Fundador)** ✅
   - `titopalaciosg5@gmail.com` → segunda conta sua? Apago, mantenho como Thiago alternativo, ou atribuo a outra pessoa?
   - `aline@palacios3dstudio.com` → **Aline (BDR)** ✅?
   - `milepalaciosg5@gmail.com` e `milena.medsouza@gmail.com` → qual das duas é a Milena (LDR) oficial? Apago a outra?
2. Sub-roles oficiais que devo cadastrar: **Thiago=CEO, Aline=BDR, Milena=LDR, Felipe=?** (CS, BDR, closer?)
3. Hunter de Negócios: para os vendedores deve aparecer **bloqueado sem opção** (recomendado) ou **com senha** como hoje?