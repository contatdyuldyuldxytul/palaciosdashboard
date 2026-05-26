## Diagnóstico

O último envio retornou `200 { id: "19e64910...", labelIds: ["SENT"] }` — para o Gmail, **a mensagem foi aceita e enviada**. Mesmo assim, o destinatário não vê assunto nem corpo. Como tanto o assunto ("Sobre titopalaciosg5@gmail.com" — ASCII puro) quanto o corpo ("Teste 12345678") sumiram, o problema não é encoding de acentos — é o **formato do MIME** sendo aceito pelo Gmail mas interpretado como cabeçalhos vazios + corpo vazio.

A causa mais provável: o `raw` da Gmail API exige uma mensagem RFC 2822 **completa**. Quando faltam headers obrigatórios (`From`, `Date`, `Message-ID`) e o `Content-Transfer-Encoding: base64` é aplicado sem o corpo estar perfeitamente conforme, alguns servidores Gmail aceitam o envelope mas reenviam apenas o cabeçalho — o destinatário recebe um "phantom email". Também é possível que `b64url` em cima de um MIME que já tem base64 chunked com CRLF esteja embaralhando o boundary entre headers e corpo.

Não dá para confirmar sem ver o MIME exato que está sendo gerado. Por isso o plano começa por **instrumentar** a edge function.

## Plano

### 1. Instrumentar `supabase/functions/gmail-send/index.ts`

- Antes de enviar para o gateway, logar:
  - O MIME **decodificado** (string crua antes do `b64url`)
  - O length do `raw` final
  - O status + body completo da resposta do Gmail API
- Logar também o `id` retornado para conseguir cruzar com a mensagem no Gmail.

### 2. Reescrever `buildRaw` para um MIME que sabidamente funciona

Trocar a estratégia para algo mais robusto e mais próximo do que o Gmail espera:

- **Adicionar headers obrigatórios**:
  - `From: me` (Gmail substitui automaticamente pelo e-mail autenticado)
  - `Date:` com data atual em formato RFC 2822
  - `Message-ID: <uuid@palacios-os>`
- **Voltar para envio sem `Content-Transfer-Encoding: base64`** no caso simples (texto puro/HTML curto), porque foi assim que sempre funcionou no Gmail e o `b64url` final já cuida do transporte. Manter o encoding RFC 2047 apenas no `Subject` (para acentos).
- Garantir CRLF (`\r\n`) em todas as quebras de linha — incluindo a separação header/body.

Formato final:
```
From: me
To: <to>
Subject: =?UTF-8?B?<base64 subject>?=   (ou plain se ASCII)
Date: <RFC 2822 date>
Message-ID: <uuid@palacios-os.local>
MIME-Version: 1.0
Content-Type: text/html; charset="UTF-8"

<HTML cru>
```

Depois `b64url` no envelope inteiro (Gmail API exige `raw` em URL-safe base64). Como o body é HTML cru (texto), o `b64url` que internamente faz `unescape(encodeURIComponent(...))` preserva os acentos.

### 3. Deploy + teste imediato via `curl_edge_functions`

Após editar:
- Deploy automático.
- Chamar a função com payload de teste e ler os logs (`edge_function_logs`) para validar:
  - O MIME montado está correto;
  - O Gmail retornou um id válido;
  - O `From` está sendo preenchido pela conta autenticada.
- Pedir ao usuário para confirmar que o e-mail de teste chegou com assunto + corpo no destinatário.

### 4. Se ainda assim falhar

Se o teste mostrar MIME correto mas o destinatário continuar não recebendo conteúdo, o próximo passo é trocar de `users/me/messages/send` com `raw` para usar `users/me/drafts` → send do draft, que faz o parsing server-side mais tolerante. Decidir baseado no resultado do passo 3.

## Arquivo afetado

- `supabase/functions/gmail-send/index.ts`
