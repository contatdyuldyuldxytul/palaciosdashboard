## Problema

1. O Composer de e-mail sempre abre como pop-up fixo no canto inferior direito. Quando há um lugar natural na tela (painel "E-mails" do lead, página Contatos, lista de Deals), ele deveria abrir **embaixo do botão "Novo e-mail"** ocupando aquele espaço. Só quando não houver lugar próprio é que faz sentido abrir centralizado.
2. E-mails enviados chegam ao destinatário com **assunto e corpo vazios**. Causa: o `buildRaw` em `supabase/functions/gmail-send/index.ts` monta o MIME concatenando o assunto e o HTML como strings cruas e depois aplica `b64url` no envelope inteiro. Caracteres acentuados (português) quebram o cabeçalho `Subject` (precisa de encoding RFC 2047) e o corpo precisa de `Content-Transfer-Encoding: base64` para sobreviver à codificação. Resultado: Gmail descarta/zera os campos.

## Plano

### 1. Composer com modo "inline" + "popup" + "modal"

Editar `src/components/crm/email/Composer.tsx`:

- Adicionar prop `variant?: "popup" | "inline" | "modal"` (default `"popup"` para retrocompatibilidade).
- `variant="inline"`: remove `fixed/right-6/bottom-0`, remove `createPortal`, renderiza dentro do fluxo do componente pai, em um card que ocupa 100% da largura disponível, altura adaptativa. Mantém todos os controles, exceto minimizar/tela cheia (ou esconde apenas quando inline).
- `variant="modal"`: `fixed inset-0` com backdrop, card centralizado (max-w-2xl).
- `variant="popup"`: comportamento atual.
- Garantir contraste correto em ambos os temas (já usa tokens `bg-card/text-card-foreground/border-border`, manter).

### 2. Trocar os call-sites para usar `inline` onde faz sentido

- `src/pages/CrmDealDetail.tsx` `EmailPanel`: ao clicar em "Novo e-mail", renderizar `<Composer variant="inline" ... />` logo abaixo do header do painel (e esconder a lista enquanto compõe, ou empurrar para baixo — empurrar para baixo é melhor).
- `src/components/crm/email/InboxView.tsx`: manter `popup` (a inbox já é uma tela cheia de e-mail, o popup do canto faz sentido lá, igual Gmail).
- `src/pages/crm/Contatos.tsx`: trocar para `variant="modal"` (centro da tela) — a página é uma tabela de contatos, não tem lugar natural inline.
- `src/components/crm/DealListView.tsx`: trocar para `variant="modal"`.

### 3. Corrigir envio de e-mail (assunto/corpo em branco)

Editar `supabase/functions/gmail-send/index.ts`, função `buildRaw`:

- Codificar `Subject` (e `To`/`Cc`/`Bcc` quando tiverem nome com acento) em RFC 2047:  
  `Subject: =?UTF-8?B?<base64 do subject>?=`
- Adicionar header `Content-Transfer-Encoding: base64` e codificar o corpo HTML em base64 (em linhas de 76 chars):
  ```
  Content-Type: text/html; charset="UTF-8"
  Content-Transfer-Encoding: base64

  <base64 do html>
  ```
- Manter `b64url` final do envelope (exigência da Gmail API).
- Sempre incluir `From: me` não é necessário (Gmail preenche), mas garantir CRLF entre headers e corpo (uma linha em branco) — já existe.

### 4. Validação

- Após o deploy automático da edge function, enviar um e-mail de teste com acento no assunto ("Olá — teste de envio") e corpo com acentos a partir do painel do deal e confirmar que o destinatário recebe assunto e corpo corretos.
- Verificar visualmente que o composer abre **inline** no painel do deal (e empurra a lista de e-mails para baixo) e **modal centralizado** em Contatos/DealList.

## Arquivos afetados

- `src/components/crm/email/Composer.tsx` (adicionar variant)
- `src/pages/CrmDealDetail.tsx` (usar inline)
- `src/pages/crm/Contatos.tsx` (usar modal)
- `src/components/crm/DealListView.tsx` (usar modal)
- `supabase/functions/gmail-send/index.ts` (encoding MIME correto)
