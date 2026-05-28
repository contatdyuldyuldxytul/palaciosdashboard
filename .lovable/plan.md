## Objetivo

1. Reimportar **organizações e pessoas** do Pipedrive com todos os campos (endereço, telefone, site, cargo, múltiplos contatos, custom fields no `raw_payload`)
2. Agendar **1 execução automática às 03:00 BRT (06:00 UTC)** pra completar `mail` + `history` quando o rate limit do Pipedrive resetar

## Mudanças

### 1. Migration — colunas faltantes
- `crm_organizations`: adicionar `telefone text`, `email text`, `cidade text`, `estado text`, `pais text`, `cep text`, `raw_payload jsonb`
- `crm_persons`: adicionar `cargo text` (já existe), `emails jsonb` (todos), `telefones jsonb` (todos), `raw_payload jsonb`
- Já existem: `site`, `endereco`, `segmento`, `linkedin`, `instagram`, `whatsapp`, `faturamento`, `porte` em orgs; `cargo`, `linkedin` em persons

### 2. Edge function `import-pipedrive-once` — fases `orgs` e `persons` enriquecidas

**Orgs**: mapear todos os campos nativos + guardar payload bruto pra custom fields:
```ts
{
  nome, pipedrive_org_id,
  endereco: o.address,
  cidade: o.address_locality,
  estado: o.address_admin_area_level_1,
  pais: o.address_country,
  cep: o.address_postal_code,
  telefone: extrair primeiro de o.phone || custom,
  email: extrair primeiro de o.email || custom,
  site: o.web || custom,
  num_colaboradores: o.people_count,
  raw_payload: o  // pra custom fields ficarem acessíveis
}
```

**Persons**: idem com todos emails/telefones + cargo + raw:
```ts
{
  nome, first_name, last_name, organization_id, pipedrive_person_id,
  email: p.email[0].value,
  telefone: p.phone[0].value,
  emails: p.email,           // jsonb com todos
  telefones: p.phone,        // jsonb com todos
  cargo: p.job_title,
  linkedin: extrair de custom,
  raw_payload: p
}
```

Mantém upsert idempotente em `pipedrive_org_id` / `pipedrive_person_id`.

### 3. Cron 03:00 BRT (1x, depois desativa)

Cria job `pg_cron` único que dispara **amanhã 06:00 UTC** o edge function executando em sequência:
- `phase=orgs` → reimporta com campos novos
- `phase=persons` → reimporta com campos novos  
- `phase=mail` → completa emails
- `phase=history` → completa changelog

Habilitar `pg_cron` + `pg_net` (já podem estar habilitados).

```sql
SELECT cron.schedule(
  'pipedrive-finalize-import',
  '0 6 29 5 *',  -- amanhã 29/05 às 06:00 UTC
  $$ SELECT net.http_post(
    url := 'https://zluhkwrcoupmqdhnjjew.supabase.co/functions/v1/import-pipedrive-once?phase=orgs',
    headers := '{"Content-Type":"application/json","apikey":"<anon>"}'::jsonb
  ); $$
);
-- + 3 cron jobs idênticos pras outras fases, escalonados de 15 em 15 min
-- 06:00 orgs, 06:15 persons, 06:30 mail, 07:30 history
```

Após sucesso, removo os 4 cron jobs (`cron.unschedule`) na próxima conversa — ou eles ficam idempotentes mesmo rodando de novo.

### 4. Tabela de log (opcional, leve)
`pipedrive_import_runs (id, phase, started_at, finished_at, summary jsonb, success bool)` pra rastrear o que rodou de madrugada sem precisar abrir logs do edge function.

## Fora de escopo
- UI de progresso
- Webhooks bidirecionais Pipedrive ↔ Lovable
- Custom fields como colunas tipadas (ficam no `raw_payload`, dá pra extrair depois sob demanda)
- Arquivos anexados aos deals

## O que você vê amanhã de manhã
- Tabela `crm_organizations` populada com endereço completo, telefone, email, site das 1.472 orgs
- Tabela `crm_persons` com todos emails/telefones + cargo das 6.267 pessoas
- `email_messages` populada (era 0)
- `crm_deal_history` populada (era 0)
- Log em `pipedrive_import_runs` confirmando sucesso de cada fase
