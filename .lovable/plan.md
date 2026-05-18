## Objetivo

Aos sábados e domingos, a aba **Hoje** do "Checklist" (em `/equipe/aline`, `/equipe/felipe`, `/equipe/milena`) deve mostrar um estado vazio claro — sem tentar puxar tarefas — porque a cadência só roda de segunda a sexta.

## Mudança

Arquivo: `src/components/DailyTasksPanel.tsx`

1. Detectar fim de semana em São Paulo (UTC-3): reaproveitar `todayISO()` de `useDailyActivities` e calcular `getDay()` (0 = domingo, 6 = sábado).
2. Quando `tab === "hoje"` e for fim de semana:
   - Desativar a query (`enabled: false`) para não buscar nada.
   - Renderizar `EmptyState` com:
     - Mensagem: **"Fim de semana — sem tarefas de cadência."**
     - Hint: **"A cadência roda de segunda a sexta. Veja a 'Semana' para se preparar."**
3. Aba **Semana** continua igual (mostra próximos 7 dias).
4. O modo `disabled` existente segue funcionando para colaboradores sem mapping.

## Detalhes técnicos

- Cálculo do dia da semana em SP:
  ```ts
  const spNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const isWeekend = spNow.getDay() === 0 || spNow.getDay() === 6;
  ```
- A lógica entra antes do bloco `mode.kind === "disabled"`, só aplicada quando `tab === "hoje"`.
- Nenhuma mudança em hooks, banco, ou na distribuição de tarefas.

## Fora do escopo

- Não vou mudar a aba "Semana".
- Não vou alterar como o `PlanoSemanalClaude` distribui tarefas (já é seg–sex).
- Não vou adicionar lógica de "antecipar próxima segunda".
