## Problema

O edge function `ai-chat` está derrubando todo stream com:

```
TypeError: messages.some is not a function
  at standardizePrompt (ai@6.0.193)
```

## Causa

Em `supabase/functions/ai-chat/index.ts` linha 518:

```ts
messages: convertToModelMessages(messages),
```

Em `ai@6`, `convertToModelMessages` é assíncrono — devolve uma `Promise<ModelMessage[]>`, não o array. O `streamText` recebe a Promise, tenta rodar `messages.some(...)` em cima dela e quebra antes de chamar o modelo. Por isso o assistente não responde.

## Correção

Adicionar `await`:

```ts
messages: await convertToModelMessages(messages),
```

Só essa linha muda. Nenhuma outra alteração de lógica, prompts, tools ou UI.

## Verificação

1. Redeploy do edge function `ai-chat`.
2. Mandar uma pergunta no `/assistente` (ex.: "Qual são os top 5 leads com a maior probabilidade de fechamento?").
3. Confirmar resposta em streaming e ausência de erros em `edge_function_logs`.