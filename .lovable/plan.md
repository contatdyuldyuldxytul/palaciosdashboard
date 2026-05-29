## Diagnóstico

**1. Notas “em branco” no histórico**
As notas estão no banco com conteúdo completo (`crm_notes.conteudo`), mas a aba **History** do deal apenas escreve “Nota adicionada” como título e o autor como subtítulo (`CrmDealDetail.tsx` linhas 932–933). O texto da nota nunca é exibido nesse timeline. A aba “Notas” já mostra o conteúdo — o problema é só no History.

**2. Campos faltando (ex.: Marcela Gomes / Habitat Incorporadora)**
Os campos que faltam (Cargo, LinkedIn, Website, Nº de colaboradores=70, Indústria, Instagram, WhatsApp, Faturamento, etc.) são **custom fields do Pipedrive**, armazenados no `raw_payload` com chaves-hash (ex.: `3124b579caab...` = Cargo, `71e659ae2f94...` = LinkedIn).
Hoje a importação só lê os campos *core* do Pipedrive — e nem todos corretamente:
- `crm_organizations.site` busca `o.web`, mas o Pipedrive devolve `website`.
- `num_colaboradores` usa `people_count` (= 4, contatos relacionados), e não o custom field “Number of employees” (= 70).
- `cargo`, `linkedin` da pessoa nunca são extraídos dos custom fields.
- Endereço da empresa hoje só salva `address_locality` no campo `endereco`, perdendo rua e número.

## Plano

### 1. Capturar definições de custom fields do Pipedrive

Nova tabela `crm_field_definitions`:
- `entity_type` (`person` | `organization` | `deal`)
- `field_key` (hash do Pipedrive)
- `name`, `field_type`, `options` (jsonb para enums), `pipedrive_field_id`
- Único por `(entity_type, field_key)`

Nova fase no `import-pipedrive-once`: `fields` → busca `/personFields`, `/organizationFields`, `/dealFields` e faz upsert nessa tabela. Roda antes de `persons`/`orgs`/`deals`.

Agendar `fields` no cron diário (6h UTC) antes das demais fases.

### 2. Enriquecer o import de pessoas e empresas

No `import-pipedrive-once` (fases `persons` e `orgs`):
- Carregar o mapa de field definitions do banco.
- Para cada registro, percorrer as chaves-hash do `raw_payload` que existirem nas definitions e montar um `custom_fields` jsonb `{ "Cargo": "Analista de marketing sênior", "LinkedIn": "http://...", ... }` (resolvendo enums via `options`).
- Persistir esse jsonb em novas colunas `crm_persons.custom_fields` e `crm_organizations.custom_fields`.

Mapear também alguns custom fields “conhecidos” para colunas existentes/novas (heurística por nome, case-insensitive):
- Pessoa: `cargo` ← campo “Cargo” (fallback `job_title`); `linkedin` (nova coluna) ← campo “LinkedIn”.
- Organização: `site` ← `payload.website` (corrigir de `o.web`); `linkedin`, `instagram`, `whatsapp`, `industry`, `annual_revenue`, `num_colaboradores` (a partir do custom field “Number of employees” se existir, senão `people_count`) — adicionar colunas que faltarem.
- Salvar endereço completo: novo campo `endereco_completo` montado a partir de `address` (rua) + `address_locality` + `address_admin_area_level_1` + `address_postal_code`.

### 3. Backfill dos registros já importados

Migration que percorre `crm_persons` e `crm_organizations`, lê `raw_payload`, e preenche `custom_fields` + colunas mapeadas usando as novas definitions. Sem precisar rebaixar nada do Pipedrive.

### 4. UI do Deal Detail

**Card “Dados do Lead” / “Dados da Empresa”** (componente que renderiza os blocos hoje incompletos):
- Mostrar os campos fixos (nome, email, telefone, cargo, linkedin, website, endereço, nº colaboradores, etc.).
- Abaixo, render genérico de `custom_fields`: iterar as chaves do jsonb e mostrar `Nome: Valor` para qualquer campo que tenha valor — assim qualquer custom field novo do Pipedrive aparece automaticamente sem código novo.
- “—” somente quando o campo realmente está vazio.

**Aba History** (`CrmDealDetail.tsx` ~ linha 932):
- Para cada nota, renderizar um card amarelo (estilo Pipedrive da imagem anexada) com:
  - cabeçalho: `<data> · <autor>`
  - corpo: `note.conteudo` (preservando quebras de linha)
- Tokens do design system: usar `bg-yellow-500/10 border-yellow-500/30 text-foreground` (ou variáveis equivalentes do tema dark) em vez de cores hardcoded.
- Demais eventos (stage_changed, status_changed, atividade concluída, deal criado) continuam com o layout atual de ícone + título.

### 5. Validação

- Rodar `import-pipedrive-once?phase=fields` → conferir que `crm_field_definitions` ficou populada (~50 definições).
- Rodar `phase=persons` e `phase=orgs` (ou o backfill da migration) → conferir que Marcela Gomes ganha cargo/linkedin e Habitat ganha website/employees=70/etc.
- Abrir o deal `f09df467-aa54-4f16-826f-bc6ab19f9be1` no app:
  - Bloco da empresa mostra Website, Nº colaboradores 70, e demais custom fields preenchidos.
  - Aba History mostra as 9 notas com texto, em cards amarelos.

## Detalhe técnico

- Sem alteração no Pipedrive; apenas leitura adicional de `/personFields`, `/organizationFields`, `/dealFields`.
- Nenhum dado é apagado — colunas novas e jsonb `custom_fields` convivem com o que já existe.
- Mapeamento por *nome do campo* (não por hash fixo) — funciona mesmo se outro Pipedrive tiver hashes diferentes.
- Backfill é idempotente; pode ser re-executado.
