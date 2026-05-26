# Composer de E-mail estilo Gmail (unificado)

## Objetivo

Substituir o atual `Composer` (modal escuro simples) por uma janela flutuante estilo Gmail, e usá-la em todos os pontos onde já há envio de e-mail na plataforma.

## Onde será usado (mesmo componente em todos)

1. **Caixa de entrada** (`/crm/email`) — botão "Novo e-mail" e "Responder" no `InboxView`.
2. **Aba E-mail dentro do lead** (`/crm/deal/:id` → aba E-mail no `CrmDealDetail`).
3. **Disparo em massa de contatos** (`/crm/contatos` — usado no `Contatos.tsx`, prefilled com a lista de contatos selecionados).
4. **Bulk action de deals** (`DealListView.tsx` — botão "E-mail" na barra de ações em massa, prefilled com e-mails dos deals selecionados).

> Observação: Em `Projects → FlowEditor`, o nó "Email" é apenas **configuração de automação** (template salvo no fluxo), não um envio manual. Não precisa virar Gmail-style — vou deixar a configuração como está.

## Como o novo Composer vai parecer (referência: imagem do Gmail anexada)

```text
┌─────────────────────────────────────────────────────────┐
│ Nova mensagem                              _   ⤢   ✕   │  ← header cinza claro
├─────────────────────────────────────────────────────────┤
│ Destinatários                                  Cc  Bcc  │  ← linha fina
├─────────────────────────────────────────────────────────┤
│ Assunto                                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Escreva sua mensagem...                               │
│                                                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [↶ ↷] [Sans Serif ▾] [B  I  U]  [≡ ▾]  [• ≡]          │  ← toolbar formatação
├─────────────────────────────────────────────────────────┤
│  [ Enviar ▾ ]   📎 🔗 😊 🖼  …                  🗑     │  ← footer
└─────────────────────────────────────────────────────────┘
```

### Comportamento

- **Janela flutuante** ancorada no canto inferior direito (`fixed bottom-0 right-6`), largura 540px, altura ~560px (não modal — usuário pode navegar pelo app com ele aberto).
- **Botões do header**: minimizar (recolhe pra barra com só o título), expandir (fullscreen ocupando 80vw/80vh), fechar.
- **Linha "Destinatários"** com chips quando múltiplos e-mails (CRM bulk), links **Cc** e **Bcc** que mostram linhas extras ao clicar.
- **Assunto** como input borderless com borda inferior fina.
- **Corpo**: `contentEditable` (rich text) — permite negrito, itálico, sublinhado, listas, links via `document.execCommand` (simples e funcional).
- **Toolbar de formatação** acima do footer: undo/redo, B/I/U, alinhamento, lista. Ícones lucide.
- **Footer**: botão "Enviar" azul Gmail-like (primary), seta dropdown ao lado ("Agendar envio" — placeholder por ora), ícone de anexo (📎 funcional, sobe pro bucket `deal-files` quando há `dealId`, senão só anexa inline), link/emoji/imagem (placeholders por ora), lixeira (descarta).
- **Auto-save de rascunho** em `localStorage` (chave por contexto: novo / reply-{id} / deal-{id} / bulk-{hash}). Restaura ao reabrir.

### Tema

- Fundo branco com texto escuro (autêntico ao Gmail), **mesmo no app dark** — Gmail é branco. Apenas a "casca" (header bar) usa cinza claro `#f2f6fc`. Botão Enviar usa azul `#0b57d0` (cor Gmail).
- Sombra forte (`shadow-2xl`) para destacar do fundo dark do app.

## Arquivos a alterar

- **`src/components/crm/email/Composer.tsx`** — reescrita completa: janela flutuante, rich text, toolbar, header com min/expand, suporte a Cc/Bcc, suporte a múltiplos destinatários (chips), anexos opcionais.
- **`src/hooks/useEmail.ts`** — estender o tipo de `useSendEmail` para aceitar `cc`, `bcc` (a edge function `gmail-send` já existe; ajusto o payload).
- **`supabase/functions/gmail-send/index.ts`** — adicionar suporte a `cc` e `bcc` no MIME (mudança mínima).
- **Sem mudanças** em `InboxView.tsx`, `CrmDealDetail.tsx`, `Contatos.tsx`, `DealListView.tsx` — eles já consomem `<Composer />` com a mesma API (`open`, `onClose`, `initialTo`, `initialSubject`, `replyTo`). A nova versão mantém essa API.

## Fora do escopo

- Agendamento real de envio (apenas botão visual).
- Inserção de emoji/imagem via picker (apenas ícones; "anexo" será funcional).
- Funcionalidade "Me ajude a escrever" (apenas placeholder no body como o Gmail mostra).
- Mudanças no nó "Email" do FlowEditor (continua sendo configuração de template).
