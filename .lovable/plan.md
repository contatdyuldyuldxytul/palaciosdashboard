## Diagnóstico

Causa raiz: no tema **escuro** (`:root` em `src/index.css`), tokens semânticos estão definidos como **branco** (`--card`, `--popover`, `--border`, `--input`, `--sidebar-background`, `--sidebar-accent`), mas os `*-foreground` correspondentes são quase brancos. Isso faz `bg-card text-card-foreground` (usado pelo Composer, Card, Dialog, Popover, Select, DropdownMenu, Sheet do shadcn) renderizar **branco-sobre-branco** no dark.

Além disso, ~40 arquivos usam classes hardcoded (`text-black`, `text-zinc-900`, `bg-white`) que ficam ilegíveis em superfícies escuras.

## Mudanças

### 1. `src/index.css` — consertar tokens do dark theme (`:root`)

```css
--card: 222 45% 9%;
--card-foreground: 220 25% 94%;
--popover: 222 45% 9%;
--popover-foreground: 220 25% 94%;
--border: 222 30% 18%;
--input: 222 30% 14%;
--sidebar-background: 222 55% 6%;
--sidebar-accent: 222 35% 14%;
--sidebar-border: 222 30% 18%;
```

Isso conserta automaticamente o Composer + todos os primitivos shadcn no dark, sem afetar o tema claro (que já tem overrides em `html.light`).

### 2. `src/index.css` — bloco de override anti-contraste para o dark

Espelho do que já existe em `html.light`, neutralizando classes hardcoded:

```css
html:not(.light) .text-black,
html:not(.light) .text-zinc-900,
html:not(.light) .text-zinc-800,
html:not(.light) .text-gray-900,
html:not(.light) .text-gray-800,
html:not(.light) .text-slate-900 { color: hsl(220 25% 94%) !important; }

html:not(.light) .bg-white { background-color: hsl(222 45% 9%) !important; }
html:not(.light) .bg-zinc-100,
html:not(.light) .bg-zinc-200,
html:not(.light) .bg-gray-100 { background-color: hsl(222 35% 12%) !important; }
```

Cinto de segurança sem risco de regressão no light.

### 3. Validação

- Browser screenshot do Composer em dark e light.
- Crop e verificação de contraste em 4 telas críticas: `/crm/deal/:id`, `/crm/email`, `/crm/contatos`, `/ceo/financeiro`.
- Alternar tema (`html.light`) e reconfirmar que nada quebrou no claro.

## Fora de escopo

- Não reescrever os 40 arquivos com classes hardcoded — os overrides do passo 2 resolvem.
- Não tocar no tema claro nem nas classes `glass-*`.

## Arquivo alterado

- `src/index.css` (único)
