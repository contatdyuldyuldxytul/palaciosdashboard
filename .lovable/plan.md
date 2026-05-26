## Problema

A versão atual do `Composer` usa estilos inline com gradiente navy hardcoded e cores translúcidas baixíssimas (`rgba(255,255,255,0.04)`, texto em `foreground/30`). Resultado: ilegível no dark e quebrado no tema claro (a plataforma tem `html.light` em `src/index.css`).

## Solução

Reescrever `src/components/crm/email/Composer.tsx` usando **apenas tokens semânticos** do design system (sem inline styles, sem cores hardcoded), seguindo o padrão dos `Dialog`/`Card` que já funcionam nos dois temas.

### Mudanças visuais

- **Shell**: `bg-card border border-border shadow-2xl rounded-t-2xl` — herda card branco no light e card escuro no dark automaticamente.
- **Header**: faixa `bg-muted/60` com `text-foreground` (sólido, não translúcido), borda inferior `border-border`. Pontinho azul `bg-primary` mantém identidade.
- **Botões da janela (min/expand/close)**: `text-muted-foreground hover:bg-muted hover:text-foreground`.
- **Linhas de campo (Para/Cc/Cco/Assunto)**: label `text-muted-foreground` w-20, input `bg-transparent text-foreground placeholder:text-muted-foreground/60`, divisores `border-border`. Contraste real garantido em ambos os temas.
- **Corpo `contentEditable`**: `text-foreground` (cor sólida — era o principal problema de legibilidade), placeholder `text-muted-foreground/60`.
- **Toolbar de formatação**: container `bg-muted border border-border rounded-xl`; botões `text-muted-foreground hover:bg-accent hover:text-accent-foreground`.
- **Footer**: `bg-muted/40 border-t border-border`. Botão Enviar `bg-primary text-primary-foreground hover:bg-primary/90` (azul Palacios em ambos os temas) com ícone `Send`. Lixeira `hover:bg-destructive/15 hover:text-destructive`.
- **Estados**: minimizada (h-11), normal (580×600), fullscreen (inset 5vh/8vw) — sem mudar comportamento.

### O que NÃO muda

- API do componente (`open`, `onClose`, `initialTo`, `initialSubject`, `replyTo`, `contextKey`) — todos os pontos de uso continuam funcionando.
- Lógica de envio, Cc/Bcc, autosave em `localStorage`, rich text via `execCommand`.
- Edge function `gmail-send` e hook `useEmail` — sem alterações.

### Arquivo alterado

- `src/components/crm/email/Composer.tsx` — reescrita só de estilos/markup.
