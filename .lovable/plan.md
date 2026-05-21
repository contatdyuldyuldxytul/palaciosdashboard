Entendi — o Secret já existe e a função está lendo `GITHUB_PAT_INSTAGRAM`. O erro atual não é “secret ausente”; é o GitHub recusando esse token para criar `repository_dispatch` no repo `contatdyuldyuldxytul/Palacios-Instagram`.

Plano:

1. Validar a função `trigger-instagram-worker`
   - Confirmar que ela usa o repo correto: `contatdyuldyuldxytul/Palacios-Instagram`.
   - Manter o dispatch em `/dispatches` com `event_type: qualificar_leads`.

2. Melhorar o diagnóstico sem expor o token
   - Fazer a função retornar uma mensagem clara quando o GitHub responder 403.
   - Informar que o token precisa estar vinculado ao repo correto e ter `Contents: Read and write` em fine-grained PAT, ou `repo` em classic PAT.
   - Não logar nem revelar o valor do Secret.

3. Testar novamente a Edge Function
   - Chamar `trigger-instagram-worker` diretamente.
   - Se continuar 403, a correção necessária será substituir/ajustar o PAT no GitHub, não no código.

Detalhe técnico:
- Para `repository_dispatch`, GitHub exige permissão de escrita em Contents. Um fine-grained PAT também precisa ter o repositório explicitamente selecionado e, se for organização, aprovado pela organização.