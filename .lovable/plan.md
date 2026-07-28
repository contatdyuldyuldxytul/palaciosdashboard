## O que eu verifiquei no banco agora

- Contatos (pessoas) vindos do Pipedrive já gravados: **6.610** (+54 criados manualmente)
- Organizações: **3.520** | Negócios: **3.303** (1.149 marcados como deletados no Pipedrive)
- Nomes distintos entre as pessoas: **5.668** (ou seja, existem duplicidades de nome)

Ou seja: os dados **já estão no banco** — inclusive mais do que os 2.144 que você espera ver. O problema está na **leitura**: as telas pedem os registros sem paginação, e o backend devolve no máximo 1.000 linhas por consulta. Por isso a lista de contatos/deals aparece cortada e "faltando gente".

## O que fazer

### 1. Corrigir a leitura truncada (causa principal)
- Criar um utilitário de busca paginada (`fetchAll`) que percorre a tabela em blocos de 1.000 até trazer tudo.
- Aplicar em:
  - `src/hooks/useContatos.ts` — pessoas, organizações, negócios e clientes ativos (hoje todos sem paginação)
  - `src/hooks/useCrm.ts` — `useCrmOrganizations`, `useCrmPersons` (limit 5000, na prática 1000), `useCrmDeals` (limit 500) e a busca global `useCrmDealsGlobalSearch` (limit 1000)
- Ajustar a tela de Contatos para exibir a contagem real e paginar/virtualizar a lista, evitando travar com milhares de linhas.

### 2. Validar a importação de fato (auditoria)
- Adicionar ao resumo do import (`import-pipedrive-once`) a contagem retornada pelo Pipedrive vs. a contagem gravada, por entidade (pessoas, organizações, negócios), para provar 100% de cobertura.
- Corrigir um ponto que hoje descarta dados em silêncio: negócios cujo estágio não está mapeado são ignorados. Existem **44 estágios sem `pipedrive_stage_id`** — vou rodar a fase `stages` primeiro e registrar no resumo quantos negócios foram descartados por falta de estágio.
- Rodar o import por fases (`fields` → `pipelines` → `stages` → `orgs` → `persons` → `deals`) e comparar os totais.

### 3. Limpeza de duplicados (opcional, confirmo antes de executar)
Há indícios de contatos repetidos (5.668 nomes distintos para 6.664 registros). Depois da auditoria eu te mostro a lista de duplicados por e-mail/nome e só faço a fusão com sua aprovação.

## Detalhes técnicos
- O limite de 1.000 linhas é do PostgREST; a solução é `.range(from, from+999)` em laço, não aumentar `limit`.
- Nada de mudança de schema é necessário nesta etapa.
- A tela de Contatos passará a receber ~6.6k linhas: aplicar filtro/paginação no cliente para manter a performance.
