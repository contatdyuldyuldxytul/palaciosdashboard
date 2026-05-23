## Objetivo
Adicionar um sistema de fluxos visuais (estilo nodes/React Flow) na página de **Deals** do CRM, igual ao que já existe na aba Projects, permitindo automatizar etapas do pipeline de vendas.

## O que será feito

### 1. Reorganizar a página `src/pages/Crm.tsx` com sub-abas
Hoje a página tem só toggle Kanban/Lista. Vou adicionar uma faixa de sub-abas (mesmo estilo da página Projects):
- **Deals** (Kanban + Lista — o conteúdo atual)
- **Fluxos** (novo — editor visual de automações)

### 2. Reaproveitar a infra de fluxos existente
A tabela `flows` (em `useFlows.ts`) e os componentes `FlowsList` + `FlowEditor` (React Flow + nodes customizados: Trigger, Email, WhatsApp, Delay, Condição, Atualizar) serão reutilizados.

Para separar fluxos de Deals dos fluxos de Projects, adiciono uma coluna `scope` ('deals' | 'projects') na tabela `flows`, com default 'projects' para não quebrar registros existentes.

### 3. Novos componentes (escopo: deals)
- `src/components/crm/deals/DealsFlowsList.tsx` — clone enxuto de `FlowsList`, filtrando por `scope='deals'`.
- `src/components/crm/deals/DealFlowEditor.tsx` — clone de `FlowEditor` mas com triggers e ações específicas de Deal:
  - **Triggers**: "Deal criado", "Deal mudou de estágio" (com seletor de estágio), "Deal parado X dias", "Deal ganho/perdido".
  - **Ações novas**: "Mover deal para estágio", "Atribuir responsável", "Criar atividade", além das já existentes (Email, WhatsApp, Delay, Condição).

### 4. Hook
Estender `useFlows.ts` aceitando `scope` opcional no `useFlows(scope?)` para listar só os fluxos do escopo desejado.

### 5. Backend (execução)
Por ora, o editor salva os fluxos no banco (igual Projects hoje). A execução real dos fluxos de deals fica como passo seguinte (edge function dedicada), fora do escopo desta tarefa de UI.

## Detalhes técnicos
- Migração: `ALTER TABLE public.flows ADD COLUMN scope text NOT NULL DEFAULT 'projects';` + index em `scope`.
- RLS atual de `flows` é mantido.
- React Flow já está instalado (`@xyflow/react`).
- Sub-abas na página Crm seguem o mesmo padrão visual da Projects (`rounded-full` chips com `glass-card`).

## Fora do escopo
- Motor de execução dos fluxos de deals (worker / edge function).
- Logs de execução por deal.
- Templates pré-prontos (podem ser adicionados depois).