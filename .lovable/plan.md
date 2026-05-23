# Plano: Pipeline ↔ Fluxo ↔ Atividades

## Decisões tomadas
- **1 Fluxo por Pipeline** (vínculo global).
- O dropdown atual "Tipo" no editor de pipeline será **substituído** por um seletor dos fluxos cadastrados (escopo `deals`).
- Cada **node do fluxo** pode ter um campo `dia_offset` (dia X após o deal entrar no pipeline). As atividades aparecem na aba **Atividades** distribuídas conforme: pipeline em que o fluxo está aplicado + data de início do deal + colaborador responsável (owner do deal).

---

## 1. Banco de dados (1 migração)

- `crm_pipelines`: adicionar coluna `flow_id uuid null` (ref. lógica para `flows.id`, sem FK rígida pra não travar exclusão).
- `crm_deals`: adicionar `flow_started_at timestamptz default now()` (preenchida no insert; também usada quando deal muda de pipeline).
- Nova tabela `flow_task_completions` para marcar conclusões sem materializar `crm_activities`:
  - `id, deal_id, flow_id, node_id text, completed_at, completed_by uuid, nota text`
  - RLS: `authenticated` lê/escreve.
- Manter `crm_pipelines.flow_type` por compatibilidade (não usado mais na UI).

## 2. FlowEditor — adicionar "dia do fluxo"

Em `FlowEditor.tsx`, no painel inspector dos nodes do grupo automação/custom (especialmente `task`, `email`, `whatsapp`, `custom`, `milestone`), adicionar campo numérico **`Dia do fluxo`** (default 1) salvo em `data.config.dia_offset`.

Também adicionar no inspector um campo opcional **`Responsável padrão`** (texto livre/seleção de colaborador). Se vazio, herda o owner do deal.

## 3. Pipeline Editor — selecionar Fluxo

Em `PipelineEditorScreen.tsx`:
- Remover o `<Select>` "Tipo" (enum `flow_type`).
- Adicionar `<Select>` **"Fluxo aplicado"** que lista `useFlows("deals")` + opção "Sem fluxo".
- Botão de atalho: "Editar fluxo →" abre o FlowEditor do fluxo selecionado (overlay).
- Salvar `flow_id` no pipeline (via `useUpdatePipeline`/`useCreatePipeline`).
- Remover dependência de `FLOW_TYPE_STAGE_TEMPLATES` (manter etapas iniciais como template "personalizado" só pra new pipeline).

## 4. Atividades — derivar do Fluxo do Pipeline

Novo hook `useFlowActivities(filters)` que retorna **tarefas virtuais**:

```text
para cada pipeline P com flow_id F:
  para cada deal D em P (status=open):
    para cada node N do flow F com config.dia_offset definido:
      dueDate = D.flow_started_at + N.dia_offset dias
      gerar item {
        deal, pipeline, node, dueDate,
        owner: D.owner_user_id / owner_label,
        tipo: N.kind, titulo: N.label,
        concluido: existe em flow_task_completions?
      }
```

Renderizado em um novo bloco **"Tarefas do Fluxo"** dentro de `NucleoOperacional` (filtrado pelo colaborador selecionado), agrupado por data (Hoje, Amanhã, Atrasadas, Próximos dias). Cada item tem checkbox que grava em `flow_task_completions`.

## 5. Pipeline Kanban — mostrar progresso do fluxo

No card de deal do Kanban, adicionar uma badge sutil **"Dia X/Y"** (X = dias desde `flow_started_at`, Y = maior `dia_offset` do fluxo). Tooltip mostra a próxima tarefa.

---

## Arquivos a criar/editar

**Migração**
- `supabase/migrations/...` — colunas + tabela `flow_task_completions` + RLS.

**Editado**
- `src/hooks/useCrm.ts` — tipar `flow_id`; aceitar em `useCreatePipeline` / `useUpdatePipeline`.
- `src/components/crm/PipelineEditorScreen.tsx` — trocar Tipo por Fluxo; botão editar.
- `src/components/crm/projects/FlowEditor.tsx` — campos `dia_offset` e responsável no inspector.
- `src/components/crm/atividades/NucleoOperacional.tsx` — embutir bloco "Tarefas do Fluxo" por colaborador.
- `src/components/crm/KanbanBoard.tsx` (ou o card que renderiza deal) — badge "Dia X/Y".

**Criado**
- `src/hooks/useFlowActivities.ts` — agrega pipelines+flows+deals+completions e devolve a lista virtual filtrada.
- `src/components/crm/atividades/FlowTasksList.tsx` — UI agrupada por data com checkbox.

## Fora de escopo
- Disparo automático de emails/WhatsApp (continua como definição visual no flow; execução real fica para depois).
- Triggers/condições (`condition`, `decision`) não geram atividade — só nodes com `dia_offset`.
- Migração dos pipelines existentes para um fluxo padrão (usuário escolhe manualmente após o deploy).
