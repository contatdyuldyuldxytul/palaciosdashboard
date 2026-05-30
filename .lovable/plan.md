## Objetivo

Quando a I.A. mencionar um deal/lead específico, o nome deve virar um link clicável que abre o deal direto em `/crm/deal/:id`.

## Mudanças

### 1. `supabase/functions/ai-chat/index.ts` — instruir o modelo a usar links

Adicionar uma regra nova ao `SYSTEM_BASE`:

> Sempre que mencionar um deal/negócio específico, escreva o título como link markdown `[Título do Deal](/crm/deal/{deal_id})`. Idem para leads usando `/crm/deal/{id}` quando o lead já tenha virado deal, ou o ID puro entre parênteses caso contrário. Nunca escreva o título "solto" sem link quando o id estiver disponível.

As tools `query_deals`, `get_deal_detail` e `rank_meeting_probability` já retornam `id` no payload, então o modelo tem o ID para montar o link.

### 2. `src/components/AIChatPage.tsx` — renderizar links como navegação interna

No `<ReactMarkdown>` da resposta do assistente, passar `components={{ a: CustomLink }}`:

- Se `href` começar com `/` (rota interna como `/crm/deal/123`): renderizar com `<Link to={href}>` do `react-router-dom`, estilizado como pill clicável (`bg-primary/10 text-primary hover:bg-primary/20 px-2 py-0.5 rounded-md font-medium no-underline`).
- Caso contrário: `<a target="_blank" rel="noreferrer">` com estilo padrão.

Importar `Link` do `react-router-dom` no topo (já é usado em outros pontos do projeto).

## Fora de escopo

- Não mudar o schema de retorno das tools.
- Não tocar nas mensagens já persistidas no banco (a próxima resposta da IA já virá com links).
- Não mexer em `ToolCard` (os títulos exibidos no preview de tool result podem virar links em iteração futura).

## Verificação

1. No `/assistente`, perguntar "Quais os top 5 deals com maior probabilidade?".
2. Confirmar que cada título aparece sublinhado/destacado como pill primária e leva para `/crm/deal/{id}` ao clicar.