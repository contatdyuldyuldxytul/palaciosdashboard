## Bug identificado

A tabela `crm_stages` **não tem unique constraint em `pipedrive_stage_id`**, então o upsert `onConflict: "pipedrive_stage_id"` falhou silenciosamente. Resultado: os 44 stages que já existiam (criados manualmente antes) ficaram com `pipedrive_stage_id = NULL`. Sem esse mapeamento, todos os deals do Pipedrive caem no `.filter(Boolean)` e voltam 0 importados.

Mesma classe de problema **não afeta** orgs/persons/deals/activities — todas têm unique key correta. Só stages.

## Correção

### 1. Migration (1 arquivo)
```sql
-- Permite upsert por pipedrive_stage_id
CREATE UNIQUE INDEX IF NOT EXISTS crm_stages_pipedrive_stage_id_key
  ON public.crm_stages(pipedrive_stage_id)
  WHERE pipedrive_stage_id IS NOT NULL;
```

### 2. Ajuste no edge function `import-pipedrive-once`, fase `stages`
Antes do upsert, fazer **backfill por (pipeline_id, nome)** nos stages existentes que ainda estão sem `pipedrive_stage_id`. Aí o upsert seguinte funciona normalmente pros novos.

```ts
// para cada stage do Pipedrive, se já existe row com mesmo (pipeline_uuid, nome) e pipedrive_stage_id NULL → UPDATE pipedrive_stage_id
// depois faz o upsert normal pros que ficarem faltando
```

### 3. Executar as fases restantes em sequência (backend, sem UI)
1. `stages` → arruma o mapeamento (44 stages ganham pipedrive_stage_id)
2. `deals` → agora consegue mapear e importar (deals abertos + 67 deletados já achados)
3. `activities` → atividades vinculadas aos deals
4. `notes` → notas vinculadas aos deals
5. `mail` → emails do Pipedrive Mail Sync
6. `history` → changelog por deal (parallel batch 10, backoff 429)

Reporto contadores finais no chat após cada fase. Se `mail` ou `history` retornarem `partial: true` por 429, te aviso pra rerodar depois (já é idempotente).

## Fora de escopo
- UI de progresso (você escolheu sem UI)
- Arquivos, custom fields, webhooks (você não pediu)
