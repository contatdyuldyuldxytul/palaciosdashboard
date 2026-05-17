## Objetivo

Adicionar um botão de fallback no componente `PlanoSemanalClaude` para criar manualmente um `weekly_plans` quando o GitHub Actions de sexta falhar. O registro criado terá **exatamente a mesma estrutura** do que o Claude insere, ficando em `status: 'draft'` para você editar e aprovar normalmente.

## Comportamento

Quando não existe plano (`plan === null`), em vez de mostrar só "Nenhum plano disponível", mostrar também um botão **"Criar plano da semana atual"**.

Ao clicar:
1. Calcula `week_start` = segunda-feira da semana atual (America/Sao_Paulo)
2. Calcula `week_end` = sexta-feira (week_start + 4 dias)
3. Insere em `weekly_plans` com os mesmos defaults da tabela:
   - `status: 'draft'`
   - `estrategia_semana: ''`
   - `prioridades: []`
   - `extras_aline/felipe/milena: []`
4. Recarrega via `load()` — que já popula a cadência padrão a partir de `cadence_templates` (cadence_2_0, D1–D5) e `meta_milena_dia: 15`

A partir daí o fluxo é idêntico ao plano vindo do Claude: você edita estratégia, prioridades, cadência, extras e clica **Aprovar e Distribuir**.

## Diferenças vs. plano do Claude

| Campo | Claude (email) | Botão manual |
|---|---|---|
| `estrategia_semana` | preenchida pelo Claude | vazia (você escreve) |
| `prioridades` | sugeridas pelo Claude | vazias (você adiciona) |
| `cadencia_semana` | sugerida pelo Claude | default de `cadence_templates` |
| `extras_*` | sugeridos pelo Claude | vazios |
| `meta_milena_dia` | sugerida pelo Claude | 15 (default) |
| `status` | `draft` | `draft` |

Estrutura no banco: **idêntica**. Mesmo schema, mesmas colunas, mesmo status inicial. A única diferença é o conteúdo vir vazio (você preenche manualmente em vez de receber pronto do Claude).

## Detalhes técnicos

- Arquivo único: `src/components/ceo/PlanoSemanalClaude.tsx`
- Nova função `criarPlanoManual()` faz `(supabase as any).from('weekly_plans').insert({...}).select().single()` e chama `load()`
- Cálculo de segunda-feira em UTC-3 usando lógica existente do projeto (mesma abordagem já usada em `addDaysISO`)
- Botão estilizado igual ao "Aprovar e Distribuir" (gradiente emerald), com ícone `Plus`
- Sem mudanças em banco, edge functions, ou outros componentes