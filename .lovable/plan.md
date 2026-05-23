## Problema

No modo claro, o header mobile, a bottom nav e alguns elementos ficam com fundo cinza/escuro porque usam cores hardcoded (`rgba(8,10,22,0.7)`, `border-white/10`, `text-white`) em vez dos tokens semânticos do design system. Resultado: texto cinza ilegível sobre fundo cinza, perdendo a regra "modo claro = texto escuro, modo escuro = texto claro".

## Mudanças

### 1. `src/components/mobile/MobileHeader.tsx`
- Remover `style={{ background: "rgba(8, 10, 22, 0.7)" }}`.
- Usar `bg-background/80 border-border` (tokens), que automaticamente vira claro no light e escuro no dark.

### 2. `src/components/mobile/MobileBottomNav.tsx`
- Remover `style={{ background: "rgba(8, 10, 22, 0.85)" }}`.
- Trocar `border-white/10` por `border-border`.
- Usar `bg-background/90` para herdar o tema.

### 3. `src/components/mobile/MobileDrawer.tsx` e `MobileCrmSubnav.tsx`
- Auditar e substituir `text-white`, `bg-white/X`, `border-white/X` hardcoded por tokens (`text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`).

### 4. `src/index.css` — reforço light mode
- Adicionar override garantindo que `text-white`, `text-white/70`, `text-white/80` virem `hsl(var(--foreground))` no light mode (já existe parcial para amber/emerald — estender para white).
- Garantir que `bg-white/5`, `bg-white/10` em superfícies fixas (nav, header) recebam fundo claro adequado.

### 5. Glass card no light mode
- Verificar que `.glass-card` em modo claro use `var(--glass-bg)` (já está branco translúcido) — sem mudanças necessárias se o token estiver correto.

## Resultado esperado

- **Light mode**: header/bottom-nav/drawer com fundo branco translúcido, texto escuro nítido, ícones legíveis.
- **Dark mode**: visual inalterado.
- Regra global aplicada: cores semânticas (`foreground`, `background`, `border`, `muted-foreground`) ao invés de hardcoded `white/dark`.

Sem mudanças em lógica/dados — somente camada de apresentação.