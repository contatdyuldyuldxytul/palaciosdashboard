## Plano

1. **Corrigir os dados já existentes**
   - Preencher `crm_deals.organization_id` para todos os deals sem empresa quando a pessoa vinculada (`crm_persons`) já tem `organization_id`.
   - Isso corrige o caso atual: o deal “Olá Casa Nova” tem pessoa vinculada e essa pessoa já aponta para a organização correta.

2. **Prevenir o problema nas próximas importações**
   - Ajustar a função `import-pipedrive-once` na fase `deals` para usar esta ordem de vínculo:
     1. organização vinda direto do deal no Pipedrive;
     2. se vier vazia, usar a organização da pessoa vinculada;
     3. manter nulo somente se nenhum dos dois existir.

3. **Validar depois da aplicação**
   - Conferir o deal aberto (`5423ab57-8828-4660-a7c7-7e8ec95cf374`) e uma contagem geral de deals com organização.
   - Confirmar que os campos de empresa aparecem disponíveis para a tela do CRM.

## Detalhe técnico

- Não precisa criar tabela nova.
- Será uma atualização de dados no banco + uma pequena alteração na edge function de importação.
- A regra é segura porque só preenche empresa em deals que estão sem `organization_id` e cuja pessoa já possui uma empresa importada.