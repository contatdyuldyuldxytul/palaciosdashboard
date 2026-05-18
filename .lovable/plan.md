# CRM Integrado — Substituir Pipedrive

Construir um CRM nativo dentro da plataforma com dados próprios no Supabase. Pipedrive será usado **apenas como import inicial** (one-shot) e depois desligado da operação. A partir daí, todas as ações (criar deal, mover de estágio, won/lost, notas, atividades) acontecem dentro da plataforma.

## Escopo do MVP

- **Múltiplos pipelines** (Aline ALFA, Hunter, Farmer, BKV, etc.) com estágios customizáveis
- **Kanban** drag-and-drop por estágio (réplica visual da foto do Pipedrive)
- **Lista/Tabela** com filtros, busca, ordenação, colunas configuráveis
- **Detalhe do deal** com timeline, notas, atividades, contatos vinculados
- **Atividades vinculadas** (ligação, e-mail, reunião, tarefa) com calendário
- **Pessoas e organizações** como entidades próprias
- **Permissões por colaborador** (Aline, Milena, Felipe, Thiago, CEO)

## Fora do MVP (fase posterior)

- Automações/workflows ("quando deal entra em X, criar Y")
- Forecast/relatórios avançados (continuam usando os dashboards atuais)
- E-mails enviados de dentro do CRM
- Integração com calendário externo (Google/Outlook)

---

## Fases

### Fase 1 — Schema + Importação do Pipedrive
- Criar tabelas `crm_pipelines`, `crm_stages`, `crm_deals`, `crm_persons`, `crm_organizations`, `crm_activities`, `crm_notes`, `crm_deal_history` (timeline imutável de eventos)
- RLS: leitura geral autenticada; escrita restrita ao **owner do deal**, ao seu manager, e ao fundador
- Edge function `import-pipedrive-once`: puxa tudo do Pipedrive (deals, persons, orgs, stages, activities, notes) e popula as tabelas. Idempotente (delete+insert por `pipedrive_id` na primeira execução, opção de re-rodar)
- Mapear `responsavel_nome` do Pipedrive → `owner_user_id` (Aline, Milena, Felipe, Thiago)

### Fase 2 — Listagem (Kanban + Lista)
- Nova rota `/crm` no sidebar (CEO + comerciais)
- Seletor de pipeline no topo
- **Kanban view**: colunas por estágio, cards drag-and-drop, contagem + soma de valores no header da coluna, paginação por coluna (limite 50 + "carregar mais")
- **Lista view**: tabela com empresa, contato, estágio, valor, owner, última atividade, dias no estágio; filtros (owner, estágio, valor, data); busca por empresa/contato
- Toggle Kanban ↔ Lista preserva filtros
- Botão **+ Novo deal** abre modal (empresa, contato, valor, estágio inicial, owner)

### Fase 3 — Detalhe do deal
- Rota `/crm/deal/:id` (modal ou página)
- Header: nome, valor, estágio (dropdown para mover), owner, won/lost
- 4 abas:
  1. **Timeline** — eventos automáticos (estágio mudou, atividade criada, valor alterado) misturados com notas
  2. **Notas** — markdown simples, criar/editar/deletar
  3. **Atividades** — lista de atividades vinculadas (ver Fase 4)
  4. **Contatos** — pessoas e organização vinculadas
- Marcar como Won → modal pede data de fechamento e cria contrato em `clientes_ativos`. Marcar como Lost → modal pede motivo

### Fase 4 — Atividades + Calendário
- Tipos: ligação, e-mail, reunião, tarefa, follow-up
- Criar atividade vinculada a deal e/ou pessoa, com data/hora, duração, descrição
- Marcar como concluída (com nota de resultado)
- Vista de calendário do colaborador (semana/mês) com todas as atividades do CRM
- Reaproveita visual e padrões do `CalendarioVendas.tsx` existente

### Fase 5 — Pessoas, Organizações e Permissões
- CRUD de pessoas (nome, e-mail, telefone, cargo, organização) e organizações (nome, site, segmento)
- Página de detalhe da organização com todos os deals + pessoas + histórico
- Refinamento de RLS por papel
- Migrar componentes existentes que liam `usePipedrive` para usar os novos hooks `useCrmDeals`, `useCrmActivities`

### Fase 6 — Desligamento do Pipedrive (opcional, após validação)
- Marcar `sync-pipedrive` como deprecated
- Manter botão "Re-importar do Pipedrive" para casos de fallback

---

## Detalhes técnicos

**Schema principal (Fase 1)**

```text
crm_pipelines (id, nome, ordem, ativo)
crm_stages    (id, pipeline_id, nome, ordem, cor, won, lost)
crm_organizations (id, nome, site, segmento, notas)
crm_persons   (id, organization_id, nome, email, telefone, cargo)
crm_deals     (id, pipeline_id, stage_id, organization_id, person_id,
               titulo, valor, owner_user_id, status [open|won|lost],
               motivo_perda, data_fechamento, expected_close_date,
               pipedrive_id (legado), stage_entered_at,
               created_at, updated_at)
crm_activities (id, deal_id, person_id, owner_user_id, tipo, titulo,
                descricao, scheduled_at, duracao_min, concluida,
                concluida_em, resultado)
crm_notes      (id, deal_id, author_user_id, conteudo, created_at)
crm_deal_history (id, deal_id, actor_user_id, evento, payload jsonb, created_at)
```

**Hooks**
- `useCrmPipelines`, `useCrmDeals(pipelineId, filters)`, `useCrmDeal(id)`, `useCrmActivities`, `useCrmOrganizations`
- Realtime via `supabase.channel` em `crm_deals` para Kanban sincronizado entre abas

**RLS**
- Leitura: `authenticated` vê tudo (mantém transparência atual da equipe)
- Escrita em `crm_deals`/`crm_activities`/`crm_notes`: owner do registro OU `fundador`
- `crm_pipelines`/`crm_stages`: somente `fundador`

**Drag-and-drop**: `@dnd-kit/core` (já no projeto via shadcn) ou adicionar `@hello-pangea/dnd`

**Importação**: edge function lê toda a pipeline "ALINE'S PIPELINE - ALFA" via Pipedrive API (já temos `PIPEDRIVE_API_KEY`), normaliza e insere. Estima ~500 deals → 1 execução, ~30s.

---

## Marco de aprovação

Cada fase é entregue funcional e testável. **Sugiro começar pelas Fases 1 + 2** (schema + import + Kanban/Lista). Isso já dá visibilidade total dentro da plataforma. Detalhe do deal, atividades e desligamento do Pipedrive vêm em seguida.

Quer que eu comece pela Fase 1 + 2, ou prefere outro recorte?
