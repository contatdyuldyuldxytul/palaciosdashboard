// AI Assistant with full data access + executable actions
// Uses AI SDK with tools (function calling) over Lovable AI Gateway
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible@2.0.48";
import { streamText, tool, stepCountIs, convertToModelMessages, type UIMessage } from "npm:ai@6.0.193";
import { z } from "npm:zod@4.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers": "X-Lovable-AIG-Run-ID",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const SYSTEM_BASE = `Você é o **Nexus**, agente de inteligência comercial integrado ao Palacios OS — plataforma operacional do Palacios 3D Studio. Você não é chatbot genérico: é consultor comercial estratégico com acesso AO VIVO a todo o CRM via tools.

## NEGÓCIO
Palacios 3D Studio — estúdio B2B de visualização arquitetônica premium (renders, animações, tours virtuais, plantas humanizadas). Vende para incorporadoras e construtoras, ticket alto (~R$20k), ciclo consultivo, metodologia **SPIN Selling**. ICP: incorporadoras em pré-lançamento/lançamento que precisam de material visual para campanha de vendas. Time: **Aline (SDR)**, **Milena (LDR)**, **Felipe (SDR)**, **Thiago (fundador/CEO)**. Pipeline principal: "ALINE'S PIPELINE - ALFA".

## CAPACIDADES (sempre via tools — nunca invente dados)
1. **Leitura de leads/deals**: \`query_deals\`, \`query_leads\`, \`get_deal_detail\`, \`query_contacts\`.
2. **Leitura de funis**: \`list_pipelines_and_stages\` (rode ANTES de filtrar por estágio, para usar os nomes reais). Etapas típicas: Entrada/Prospecção → Primeiro Contato → Qualificação (SPIN) → Proposta Enviada → Negociação → Won/Lost. Adapte aos nomes reais.
3. **Direcionamento estratégico**: combine \`crm_metrics\` (gargalos, valor parado) + \`rank_meeting_probability\` (deals quentes) + \`query_deals\` com \`stale_days\` (reativação).
4. **Análise de performance**: \`crm_metrics\` + \`query_activities\` — conversão por etapa, tempo médio, carga por owner, motivos de perda.
5. **Reativação inteligente**: deals em Proposta há +30d, perdidos há +6m, deals avançados parados — sugira abordagem personalizada baseada nas notas.
6. **ICP intelligence**: cruze \`query_deals\` agrupando por segmento/origem/cargo para responder "qual perfil fecha mais", "qual canal converte melhor".
7. **Execução no CRM**: \`move_deals_to_stage\`, \`update_deal_owner\`, \`add_deal_note\`, \`add_activity\`, \`bulk_update_deals\` — todas com \`needsApproval\`. SEMPRE apresente preview (quantos registros, exemplos, qual a mudança) antes de pedir confirmação. Exporte planilhas com \`export_to_csv\`.

## REGRAS DE COMPORTAMENTO
- **Direto e estratégico**. Audiência principal é o CEO (Thiago) — sem enrolação, sem disclaimers genéricos.
- **Dados, não suposições**. Se faltar contexto, diga o que está disponível e pergunte o que falta.
- **Toda resposta termina com próxima ação clara ou pergunta de follow-up** que avança a conversa.
- **Formato de resposta estratégica**: (1) Diagnóstico rápido, (2) Top 3 ações priorizadas por impacto, (3) Justificativa com dados, (4) Próximo passo.
- **Ações destrutivas em massa exigem confirmação explícita** — sempre liste o que será afetado antes.
- **Tom**: com fundador, estratégico e direto; em análises operacionais para o time, mais claro e instrutivo.
- **Leads frios ≠ leads mortos**. Ciclo de venda é longo e consultivo.

## DESAMBIGUAÇÃO DE FUNIL E ETAPA (OBRIGATÓRIO)
Quando o usuário mencionar funil/pipeline/etapa de forma vaga ou informal (ex: "reciclagem", "aquecimento", "lista fria", "funil da Aline", "qualificados"), siga este fluxo SEM EXCEÇÃO:
1. Rode \`list_pipelines_and_stages\` antes de qualquer ação.
2. Se houver **um único match razoável** entre o termo e os nomes reais, confirme em uma frase curta antes de agir: *"Entendi como o funil 'SDR — Aline', etapa 'Qualificação'. Confirmo?"* — só prossiga após o "sim".
3. Se houver **ambiguidade** (mais de um candidato ou nenhum match óbvio), NÃO assuma. Responda com a lista numerada dos pipelines/etapas reais e peça seleção:
   \`\`\`
   Não identifiquei exatamente qual funil você quer. Escolha:
   1. [nome real do pipeline]
   2. [nome real do pipeline]
   3. [nome real do pipeline]
   Ou me diga o nome exato.
   \`\`\`
4. Mesmo fluxo para **etapa dentro do funil**: se a etapa for ambígua, liste as etapas reais do funil escolhido e peça seleção antes de prosseguir.
5. **NUNCA** chame \`move_deals_to_stage\`, \`bulk_update_deals\`, \`update_deal_owner\` ou qualquer ação destrutiva enquanto funil ou etapa estiverem ambíguos. Confirmação explícita primeiro, execução depois.



## REGRAS TÉCNICAS
- Sempre em **português brasileiro**, **Markdown**, com tabelas quando útil. Use **R$**, datas **DD/MM/YYYY**, fuso **America/Sao_Paulo**.
- SEMPRE que mencionar um deal específico (em texto, listas OU tabelas), escreva o título como link markdown interno: \`[Título do Deal](/crm/deal/{id})\` usando o \`id\` (UUID) retornado pelas tools. Vale dentro de células de tabela — nunca escreva o título "solto" se você tem o id. Para leads (tabela legada) que ainda não viraram deal, escreva o nome normalmente.`;

const SYSTEM_PROMPTS: Record<string, string> = {
  vendas: `${SYSTEM_BASE}\n\n## PAPEL ATUAL: Nexus para Vendedor\nFoque em priorizar deals quentes do próprio vendedor, sugerir scripts SPIN para contornar objeções, identificar próximos passos por lead e acelerar fechamentos. Ao listar deals, ordene por probabilidade de avanço. Traga sempre uma ação concreta para o dia.`,
  fundador: `${SYSTEM_BASE}\n\n## PAPEL ATUAL: Nexus para o CEO\nFoque em decisão estratégica: onde alocar a energia da semana, gargalos do funil, distribuição de carga entre Aline/Milena/Felipe, padrão de ICP que mais converte, oportunidades de reativação. Seja analítico, traga números absolutos + percentuais, aponte trade-offs. Tom direto, sem formalidades.`,
  geral: `${SYSTEM_BASE}\n\n## PAPEL ATUAL: Nexus geral\nResponda perguntas operacionais sobre o CRM, processos e mercado, sempre baseado nos dados reais. Tom neutro e claro.`,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeUserClient(authHeader: string) {
  return createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
}

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

async function logAction(params: {
  userId: string;
  assistant: string;
  toolName: string;
  input: unknown;
  output: unknown;
  affectedCount?: number;
  success: boolean;
  errorMessage?: string;
}) {
  await adminClient.from("ai_assistant_actions").insert({
    user_id: params.userId,
    assistant: params.assistant,
    tool_name: params.toolName,
    input: params.input as any,
    output: params.output as any,
    affected_count: params.affectedCount ?? 0,
    success: params.success,
    error_message: params.errorMessage,
  });
}

async function isFundador(userId: string): Promise<boolean> {
  const { data } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "fundador")
    .maybeSingle();
  return !!data;
}

function toCsv(rows: Record<string, any>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n;]/.test(s) ? `"${s}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Tools factory (closures over user context)
// ─────────────────────────────────────────────────────────────────────────────

function buildTools(ctx: {
  userId: string;
  assistant: string;
  fundador: boolean;
  userClient: ReturnType<typeof createClient>;
}) {
  const { userId, assistant, fundador, userClient } = ctx;
  // Tools de escrita aplicam scope: vendedor só pode mexer no que é dele.
  // Tools de leitura usam userClient (RLS-aware).

  return {
    // ===================== LEITURA =====================

    list_pipelines_and_stages: tool({
      description: "Lista todos os pipelines do CRM e seus estágios, com cor e ordem. Use para entender a estrutura antes de filtrar deals.",
      inputSchema: z.object({}),
      execute: async () => {
        const { data: pipelines } = await userClient
          .from("crm_pipelines").select("id, nome, ordem, ativo, owner_label").eq("ativo", true).order("ordem");
        const { data: stages } = await userClient
          .from("crm_stages").select("id, pipeline_id, nome, ordem, cor, is_won, is_lost").order("ordem");
        return { pipelines: pipelines ?? [], stages: stages ?? [] };
      },
    }),

    query_deals: tool({
      description: "Consulta deals do CRM com filtros. Retorna até 200 por chamada. Use para responder perguntas sobre deals abertos, parados, por estágio, por owner, etc.",
      inputSchema: z.object({
        pipeline_id: z.string().uuid().optional().describe("Filtra por pipeline"),
        stage_id: z.string().uuid().optional().describe("Filtra por estágio específico"),
        owner_user_id: z.string().uuid().optional().describe("Filtra por responsável"),
        status: z.enum(["open", "won", "lost"]).optional(),
        min_valor: z.number().optional(),
        max_valor: z.number().optional(),
        stale_days: z.number().int().min(1).optional().describe("Apenas deals parados há N+ dias (sem mudança de estágio)"),
        search: z.string().optional().describe("Busca texto livre em titulo/notas"),
        limit: z.number().int().min(1).max(500).default(100),
        order_by: z.enum(["valor", "stage_entered_at", "updated_at"]).default("updated_at"),
        order_dir: z.enum(["asc", "desc"]).default("desc"),
      }),
      execute: async (args) => {
        let q = userClient.from("crm_deals").select(
          "id, titulo, valor, status, stage_id, pipeline_id, owner_user_id, owner_label, stage_entered_at, updated_at, notas, temperatura, probabilidade, expected_close_date"
        );
        if (args.pipeline_id) q = q.eq("pipeline_id", args.pipeline_id);
        if (args.stage_id) q = q.eq("stage_id", args.stage_id);
        if (args.owner_user_id) q = q.eq("owner_user_id", args.owner_user_id);
        if (args.status) q = q.eq("status", args.status);
        if (args.min_valor !== undefined) q = q.gte("valor", args.min_valor);
        if (args.max_valor !== undefined) q = q.lte("valor", args.max_valor);
        if (args.stale_days) {
          const cutoff = new Date(Date.now() - args.stale_days * 86400000).toISOString();
          q = q.lte("stage_entered_at", cutoff);
        }
        if (args.search) q = q.or(`titulo.ilike.%${args.search}%,notas.ilike.%${args.search}%`);
        q = q.order(args.order_by, { ascending: args.order_dir === "asc" }).limit(args.limit);
        const { data, error } = await q;
        if (error) return { error: error.message, deals: [] };
        return { count: data?.length ?? 0, deals: data ?? [] };
      },
    }),

    get_deal_detail: tool({
      description: "Retorna detalhe completo de um deal: dados, pessoa, organização, notas, últimas atividades e histórico de estágio.",
      inputSchema: z.object({ deal_id: z.string().uuid() }),
      execute: async ({ deal_id }) => {
        const { data: deal } = await userClient.from("crm_deals").select("*").eq("id", deal_id).maybeSingle();
        if (!deal) return { error: "Deal não encontrado" };
        const [person, org, notes, activities, history] = await Promise.all([
          deal.person_id ? userClient.from("crm_persons").select("*").eq("id", deal.person_id).maybeSingle().then((r: any) => r.data) : null,
          deal.organization_id ? userClient.from("crm_organizations").select("*").eq("id", deal.organization_id).maybeSingle().then((r: any) => r.data) : null,
          userClient.from("crm_notes").select("conteudo, author_label, created_at").eq("deal_id", deal_id).order("created_at", { ascending: false }).limit(20).then((r: any) => r.data),
          userClient.from("crm_activities").select("titulo, tipo, scheduled_at, concluida, resultado").eq("deal_id", deal_id).order("scheduled_at", { ascending: false }).limit(20).then((r: any) => r.data),
          userClient.from("crm_deal_history").select("evento, payload, created_at").eq("deal_id", deal_id).order("created_at", { ascending: false }).limit(20).then((r: any) => r.data),
        ]);
        return { deal, person, organization: org, notes, activities, history };
      },
    }),

    query_leads: tool({
      description: "Consulta a tabela legada de leads (prospecção). Use quando o usuário falar em 'leads' (não 'deals').",
      inputSchema: z.object({
        status: z.enum(["lead", "contatado", "reuniao_agendada", "reuniao_realizada", "proposta", "fechado", "perdido"]).optional(),
        responsavel_id: z.string().uuid().optional(),
        stale_days: z.number().int().min(1).optional(),
        search: z.string().optional(),
        limit: z.number().int().min(1).max(500).default(100),
      }),
      execute: async (args) => {
        let q = userClient.from("leads").select("id, empresa, contato, cargo, email, telefone, status, responsavel_nome, origem, valor_estimado, data_criacao, data_atualizacao, notas");
        if (args.status) q = q.eq("status", args.status);
        if (args.responsavel_id) q = q.eq("responsavel_id", args.responsavel_id);
        if (args.stale_days) {
          const cutoff = new Date(Date.now() - args.stale_days * 86400000).toISOString();
          q = q.lte("data_atualizacao", cutoff);
        }
        if (args.search) q = q.or(`empresa.ilike.%${args.search}%,contato.ilike.%${args.search}%,notas.ilike.%${args.search}%`);
        q = q.order("data_atualizacao", { ascending: false }).limit(args.limit);
        const { data, error } = await q;
        if (error) return { error: error.message, leads: [] };
        return { count: data?.length ?? 0, leads: data ?? [] };
      },
    }),

    query_activities: tool({
      description: "Lista atividades/tarefas do CRM. Use para responder sobre follow-ups, reuniões pendentes, etc.",
      inputSchema: z.object({
        owner_user_id: z.string().uuid().optional(),
        deal_id: z.string().uuid().optional(),
        concluida: z.boolean().optional(),
        from_date: z.string().optional().describe("ISO date inicial"),
        to_date: z.string().optional().describe("ISO date final"),
        limit: z.number().int().min(1).max(300).default(100),
      }),
      execute: async (args) => {
        let q = userClient.from("crm_activities").select("id, deal_id, titulo, tipo, scheduled_at, concluida, owner_label, resultado");
        if (args.owner_user_id) q = q.eq("owner_user_id", args.owner_user_id);
        if (args.deal_id) q = q.eq("deal_id", args.deal_id);
        if (args.concluida !== undefined) q = q.eq("concluida", args.concluida);
        if (args.from_date) q = q.gte("scheduled_at", args.from_date);
        if (args.to_date) q = q.lte("scheduled_at", args.to_date);
        q = q.order("scheduled_at", { ascending: true }).limit(args.limit);
        const { data, error } = await q;
        if (error) return { error: error.message, activities: [] };
        return { count: data?.length ?? 0, activities: data ?? [] };
      },
    }),

    query_contacts: tool({
      description: "Busca pessoas (contatos) e organizações do CRM por nome/email/telefone.",
      inputSchema: z.object({ search: z.string().min(1), limit: z.number().int().min(1).max(100).default(30) }),
      execute: async ({ search, limit }) => {
        const [persons, orgs] = await Promise.all([
          userClient.from("crm_persons").select("id, nome, email, telefone, cargo, organization_id")
            .or(`nome.ilike.%${search}%,email.ilike.%${search}%,telefone.ilike.%${search}%`).limit(limit),
          userClient.from("crm_organizations").select("id, nome, site, segmento")
            .or(`nome.ilike.%${search}%,site.ilike.%${search}%`).limit(limit),
        ]);
        return { persons: persons.data ?? [], organizations: orgs.data ?? [] };
      },
    }),

    crm_metrics: tool({
      description: "Métricas agregadas do CRM: contagem por estágio, valor total por pipeline, deals parados, taxa de conversão. Opcionalmente filtrado por pipeline ou owner.",
      inputSchema: z.object({
        pipeline_id: z.string().uuid().optional(),
        owner_user_id: z.string().uuid().optional(),
      }),
      execute: async (args) => {
        let q = userClient.from("crm_deals").select("status, stage_id, valor, stage_entered_at, owner_label");
        if (args.pipeline_id) q = q.eq("pipeline_id", args.pipeline_id);
        if (args.owner_user_id) q = q.eq("owner_user_id", args.owner_user_id);
        const { data } = await q.limit(5000);
        const rows = data ?? [];
        const total = rows.length;
        const by_status = rows.reduce((acc: any, r: any) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; }, {});
        const by_stage: any = {};
        for (const r of rows) {
          if (!by_stage[r.stage_id]) by_stage[r.stage_id] = { count: 0, valor: 0 };
          by_stage[r.stage_id].count += 1;
          by_stage[r.stage_id].valor += Number(r.valor) || 0;
        }
        const stale_30 = rows.filter((r: any) => r.status === "open" && (Date.now() - new Date(r.stage_entered_at).getTime()) > 30 * 86400000).length;
        const stale_7 = rows.filter((r: any) => r.status === "open" && (Date.now() - new Date(r.stage_entered_at).getTime()) > 7 * 86400000).length;
        const valor_total_open = rows.filter((r: any) => r.status === "open").reduce((s: number, r: any) => s + (Number(r.valor) || 0), 0);
        return { total, by_status, by_stage, stale_7_days: stale_7, stale_30_days: stale_30, valor_total_open };
      },
    }),

    rank_meeting_probability: tool({
      description: "Ranking dos deals com maior probabilidade de fechar uma REUNIÃO. Usa heurística (estágio, recência, valor, presença de notas) e re-ranqueia analisando as notas. Devolve top N com score 0-100 e justificativa.",
      inputSchema: z.object({
        pipeline_id: z.string().uuid().optional(),
        owner_user_id: z.string().uuid().optional(),
        top_n: z.number().int().min(1).max(50).default(10),
      }),
      execute: async (args) => {
        let q = userClient.from("crm_deals")
          .select("id, titulo, valor, stage_id, stage_entered_at, notas, owner_label, temperatura, probabilidade, updated_at")
          .eq("status", "open");
        if (args.pipeline_id) q = q.eq("pipeline_id", args.pipeline_id);
        if (args.owner_user_id) q = q.eq("owner_user_id", args.owner_user_id);
        const { data } = await q.limit(500);
        const rows = data ?? [];
        if (rows.length === 0) return { ranked: [] };

        // Stages: heurística simples - estágios mais avançados = maior peso
        const { data: stagesData } = await userClient.from("crm_stages").select("id, ordem, nome, is_won, is_lost");
        const stageMap = new Map((stagesData ?? []).map((s: any) => [s.id, s]));
        const maxOrdem = Math.max(...(stagesData ?? []).map((s: any) => s.ordem ?? 0), 1);
        const valores = rows.map((r: any) => Number(r.valor) || 0);
        const maxValor = Math.max(...valores, 1);

        const heuristics = rows.map((r: any) => {
          const stage: any = stageMap.get(r.stage_id);
          const stageW = stage ? (stage.ordem ?? 0) / maxOrdem : 0;
          const daysSince = (Date.now() - new Date(r.stage_entered_at).getTime()) / 86400000;
          const recency = Math.max(0, 1 - daysSince / 30); // recente = bom
          const hasNotes = r.notas && r.notas.length > 20 ? 1 : 0;
          const tempScore = r.temperatura === "quente" ? 1 : r.temperatura === "morno" ? 0.6 : r.temperatura === "frio" ? 0.2 : 0.5;
          const valorN = (Number(r.valor) || 0) / maxValor;
          const score = Math.round(100 * (0.30 * stageW + 0.25 * recency + 0.15 * hasNotes + 0.20 * tempScore + 0.10 * valorN));
          return { ...r, _score: score, _stageNome: stage?.nome ?? "?" };
        }).sort((a: any, b: any) => b._score - a._score).slice(0, args.top_n * 2);

        return {
          ranked: heuristics.slice(0, args.top_n).map((d: any) => ({
            id: d.id, titulo: d.titulo, valor: d.valor, estagio: d._stageNome,
            owner: d.owner_label, score: d._score, temperatura: d.temperatura,
            dias_no_estagio: Math.round((Date.now() - new Date(d.stage_entered_at).getTime()) / 86400000),
            notas_preview: d.notas ? d.notas.slice(0, 300) : null,
          })),
          instruction_to_model: "Analise as notas dos top candidatos e re-ranqueie se houver sinais fortes (interesse explícito, orçamento, urgência, decisor envolvido). Justifique a escolha final ao usuário.",
        };
      },
    }),

    // ===================== EXPORT =====================

    export_to_csv: tool({
      description: "Exporta os resultados de uma consulta para um CSV em storage público e retorna URL de download. Passe os dados já filtrados (use query_deals/query_leads antes e cole os arrays aqui).",
      inputSchema: z.object({
        filename: z.string().describe("Nome do arquivo, sem extensão. Ex: 'leads_parados_30d'"),
        rows: z.array(z.record(z.string(), z.any())).describe("Linhas a exportar (array de objetos)"),
      }),
      execute: async ({ filename, rows }) => {
        if (rows.length === 0) return { error: "Nenhum dado para exportar" };
        const csv = toCsv(rows);
        const safe = filename.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60);
        const path = `${userId}/${Date.now()}_${safe}.csv`;
        const { error } = await adminClient.storage.from("ai-exports").upload(path, new Blob([csv], { type: "text/csv" }), {
          contentType: "text/csv", upsert: false,
        });
        if (error) return { error: error.message };
        const { data: pub } = adminClient.storage.from("ai-exports").getPublicUrl(path);
        await logAction({ userId, assistant, toolName: "export_to_csv", input: { filename, count: rows.length }, output: { path }, affectedCount: rows.length, success: true });
        return { url: pub.publicUrl, filename: `${safe}.csv`, rows_exported: rows.length };
      },
    }),

    // ===================== ESCRITA (needsApproval) =====================

    move_deals_to_stage: tool({
      description: "Move uma lista de deals para um estágio destino. SEMPRE pede confirmação humana antes de executar. Vendedores só conseguem mover deals onde são owner; fundador move qualquer um.",
      inputSchema: z.object({
        deal_ids: z.array(z.string().uuid()).min(1).max(500),
        target_stage_id: z.string().uuid(),
      }),
      needsApproval: true,
      execute: async ({ deal_ids, target_stage_id }) => {
        // Confere stage existe
        const { data: stage } = await adminClient.from("crm_stages").select("id, nome, pipeline_id").eq("id", target_stage_id).maybeSingle();
        if (!stage) return { error: "Estágio destino não encontrado" };

        // Scope: vendedor só mexe nos seus
        let q = adminClient.from("crm_deals").update({ stage_id: target_stage_id }).in("id", deal_ids);
        if (!fundador) q = q.eq("owner_user_id", userId);
        const { data, error } = await q.select("id");
        if (error) {
          await logAction({ userId, assistant, toolName: "move_deals_to_stage", input: { deal_ids, target_stage_id }, output: null, success: false, errorMessage: error.message });
          return { error: error.message };
        }
        const affected = data?.length ?? 0;
        await logAction({ userId, assistant, toolName: "move_deals_to_stage", input: { deal_ids, target_stage_id }, output: { affected }, affectedCount: affected, success: true });
        return { moved: affected, requested: deal_ids.length, target_stage: stage.nome, scope_note: fundador ? "Acesso total" : "Apenas deals do vendedor" };
      },
    }),

    update_deal_owner: tool({
      description: "Reatribui o responsável (owner) de deals. Apenas fundador pode reatribuir entre owners diferentes.",
      inputSchema: z.object({
        deal_ids: z.array(z.string().uuid()).min(1).max(500),
        new_owner_user_id: z.string().uuid(),
        new_owner_label: z.string().optional(),
      }),
      needsApproval: true,
      execute: async ({ deal_ids, new_owner_user_id, new_owner_label }) => {
        if (!fundador) return { error: "Apenas fundador pode reatribuir owner." };
        const { data, error } = await adminClient.from("crm_deals")
          .update({ owner_user_id: new_owner_user_id, owner_label: new_owner_label ?? null })
          .in("id", deal_ids).select("id");
        if (error) {
          await logAction({ userId, assistant, toolName: "update_deal_owner", input: { deal_ids, new_owner_user_id }, output: null, success: false, errorMessage: error.message });
          return { error: error.message };
        }
        const affected = data?.length ?? 0;
        await logAction({ userId, assistant, toolName: "update_deal_owner", input: { deal_ids, new_owner_user_id }, output: { affected }, affectedCount: affected, success: true });
        return { updated: affected };
      },
    }),

    add_deal_note: tool({
      description: "Adiciona uma nota a um deal. Requer confirmação.",
      inputSchema: z.object({
        deal_id: z.string().uuid(),
        conteudo: z.string().min(3).max(5000),
      }),
      needsApproval: true,
      execute: async ({ deal_id, conteudo }) => {
        // Scope check para vendedor
        if (!fundador) {
          const { data: d } = await adminClient.from("crm_deals").select("owner_user_id").eq("id", deal_id).maybeSingle();
          if (!d || d.owner_user_id !== userId) return { error: "Sem permissão para este deal" };
        }
        const { data, error } = await adminClient.from("crm_notes").insert({
          deal_id, conteudo, author_user_id: userId, author_label: "Assistente IA",
        }).select().single();
        if (error) {
          await logAction({ userId, assistant, toolName: "add_deal_note", input: { deal_id }, output: null, success: false, errorMessage: error.message });
          return { error: error.message };
        }
        await logAction({ userId, assistant, toolName: "add_deal_note", input: { deal_id }, output: { id: data.id }, affectedCount: 1, success: true });
        return { created: true, note_id: data.id };
      },
    }),

    add_activity: tool({
      description: "Cria uma atividade/tarefa para um deal (ligação, reunião, email, follow-up). Requer confirmação.",
      inputSchema: z.object({
        deal_id: z.string().uuid(),
        titulo: z.string().min(3).max(200),
        tipo: z.enum(["ligacao", "reuniao", "email", "tarefa", "whatsapp"]).default("tarefa"),
        scheduled_at: z.string().optional().describe("ISO datetime"),
        descricao: z.string().optional(),
      }),
      needsApproval: true,
      execute: async ({ deal_id, titulo, tipo, scheduled_at, descricao }) => {
        if (!fundador) {
          const { data: d } = await adminClient.from("crm_deals").select("owner_user_id, owner_label").eq("id", deal_id).maybeSingle();
          if (!d || d.owner_user_id !== userId) return { error: "Sem permissão para este deal" };
        }
        const { data: deal } = await adminClient.from("crm_deals").select("owner_user_id, owner_label").eq("id", deal_id).maybeSingle();
        const { data, error } = await adminClient.from("crm_activities").insert({
          deal_id, titulo, tipo: tipo as any, scheduled_at: scheduled_at ?? null, descricao: descricao ?? null,
          owner_user_id: deal?.owner_user_id ?? userId, owner_label: deal?.owner_label ?? "IA",
        }).select().single();
        if (error) {
          await logAction({ userId, assistant, toolName: "add_activity", input: { deal_id, titulo }, output: null, success: false, errorMessage: error.message });
          return { error: error.message };
        }
        await logAction({ userId, assistant, toolName: "add_activity", input: { deal_id, titulo }, output: { id: data.id }, affectedCount: 1, success: true });
        return { created: true, activity_id: data.id };
      },
    }),

    bulk_update_deals: tool({
      description: "Atualiza campos genéricos (status, valor, probabilidade, temperatura, expected_close_date) em uma lista de deals. Requer confirmação. Vendedor só mexe nos próprios.",
      inputSchema: z.object({
        deal_ids: z.array(z.string().uuid()).min(1).max(500),
        updates: z.object({
          status: z.enum(["open", "won", "lost"]).optional(),
          valor: z.number().optional(),
          probabilidade: z.number().min(0).max(100).optional(),
          temperatura: z.enum(["quente", "morno", "frio"]).optional(),
          expected_close_date: z.string().optional(),
          motivo_perda: z.string().optional(),
        }),
      }),
      needsApproval: true,
      execute: async ({ deal_ids, updates }) => {
        let q = adminClient.from("crm_deals").update(updates as any).in("id", deal_ids);
        if (!fundador) q = q.eq("owner_user_id", userId);
        const { data, error } = await q.select("id");
        if (error) {
          await logAction({ userId, assistant, toolName: "bulk_update_deals", input: { deal_ids, updates }, output: null, success: false, errorMessage: error.message });
          return { error: error.message };
        }
        const affected = data?.length ?? 0;
        await logAction({ userId, assistant, toolName: "bulk_update_deals", input: { deal_ids, updates }, output: { affected }, affectedCount: affected, success: true });
        return { updated: affected, requested: deal_ids.length };
      },
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = makeUserClient(authHeader);
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const messages: UIMessage[] = body.messages ?? [];
    const assistant: string = body.assistant ?? "geral";

    const fundador = await isFundador(userId);
    const systemPrompt = SYSTEM_PROMPTS[assistant] || SYSTEM_PROMPTS.geral;
    const tools = buildTools({ userId, assistant, fundador, userClient });

    const provider = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: {
        "Lovable-API-Key": LOVABLE_API_KEY,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
    });
    const model = provider(assistant === "fundador" ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash");

    const result = streamText({
      model,
      system: systemPrompt + `\n\nContexto do usuário: role=${fundador ? "fundador" : "vendedor"} user_id=${userId}`,
      messages: await convertToModelMessages(messages),
      tools,
      stopWhen: stepCountIs(50),
      onError: (err) => console.error("streamText error:", err),
    });

    return result.toUIMessageStreamResponse({
      headers: corsHeaders,
      originalMessages: messages,
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
