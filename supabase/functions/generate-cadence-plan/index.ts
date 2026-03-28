import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getFirstMonday(year: number, month: number): Date {
  const d = new Date(year, month, 1);
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  return d;
}

function getWorkingDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    if (d.getDay() >= 1 && d.getDay() <= 5) days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function formatDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function formatDateISO(d: Date): string {
  return d.toISOString().split("T")[0];
}

const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { total_leads, meta_demos, meta_contratos, meta_receita, minimo_viavel } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    const firstMonday = getFirstMonday(year, month);
    const workingDays = getWorkingDays(year, month);
    const firstHalfDays = workingDays.filter(d => d.getDate() < 15);
    const secondHalfDays = workingDays.filter(d => d.getDate() >= 15);

    const groupALeads = Math.ceil(total_leads / 2);
    const groupBLeads = Math.floor(total_leads / 2);

    // Calculate Milena daily goals
    const milenaDailyFirst = firstHalfDays.length > 0 ? Math.ceil(groupALeads / firstHalfDays.length) : 0;
    const milenaDailySecond = secondHalfDays.length > 0 ? Math.ceil(groupBLeads / secondHalfDays.length) : 0;

    // Second first monday (for cycle 2)
    const secondFirstMonday = new Date(year, month, 15);
    while (secondFirstMonday.getDay() !== 1) secondFirstMonday.setDate(secondFirstMonday.getDate() + 1);

    const prompt = `Você é especialista em planejamento comercial B2B.
Gere o planejamento mensal completo para a Palacios 3D Studio seguindo o Fluxo de Cadência 2.0.

FLUXO DE CADÊNCIA 2.0 — REGRAS:
- Duração: 10 dias úteis (2 semanas)
- Grupos alternam por dia: 
  Dia ímpar = Grupo A (amarelo)
  Dia par = Grupo B (verde)
- Cadência começa SEMPRE na primeira segunda-feira
- Há 2 ciclos de cadência por mês

ATIVIDADES POR DIA DO CICLO:
Dia 01 (Seg) Grupo A: manhã=Email, manhã2=WhatsApp, tarde=LinkedIn
Dia 02 (Ter) Grupo B: manhã=Email, manhã2=WhatsApp, tarde=LinkedIn
Dia 03 (Qua) Grupo A: manhã=Email, manhã2=Ligação, tarde=Ligação
Dia 04 (Qui) Grupo B: manhã=Email, manhã2=Ligação, tarde=Ligação, tarde2=WhatsApp
Dia 05 (Sex) Grupo A: manhã=Ligação, manhã2=Ligação, tarde=LinkedIn, tarde2=WhatsApp
Dia 06 (Seg) Grupo B: manhã=Ligação, manhã2=LinkedIn, tarde=Ligação, tarde2=WhatsApp
Dia 07 (Ter) Grupo A: manhã=Email, manhã2=Ligação, tarde=Ligação, tarde2=Ligação
Dia 08 (Qua) Grupo B: manhã=Email, manhã2=Ligação, tarde=Ligação, tarde2=Ligação
Dia 09 (Qui) Grupo A: manhã=Ligação, manhã2=Ligação, tarde=WhatsApp, tarde2=Ligação
Dia 10 (Sex) Grupo B: manhã=Ligação, manhã2=Email, tarde=Email, tarde2=WhatsApp

DADOS DO MÊS:
- Mês: ${monthNames[month]}/${year}
- Primeira segunda-feira: ${formatDate(firstMonday)}
- Total leads: ${total_leads}
- Grupo A leads: ${groupALeads}
- Grupo B leads: ${groupBLeads}
- Meta demos: ${meta_demos}
- Meta contratos: ${meta_contratos}
- Dias úteis Milena 1ª quinzena: ${firstHalfDays.length}
- Dias úteis Milena 2ª quinzena: ${secondHalfDays.length}
- Meta diária Milena 1ª quinzena: ${milenaDailyFirst}
- Meta diária Milena 2ª quinzena: ${milenaDailySecond}

Gere o planejamento completo retornando APENAS JSON válido:
{
  "resumo": {
    "mes": "${monthNames[month]}/${year}",
    "primeira_segunda": "${formatDate(firstMonday)}",
    "grupo_a_leads": ${groupALeads},
    "grupo_b_leads": ${groupBLeads},
    "ciclo1_inicio": "${formatDate(firstMonday)}",
    "ciclo2_inicio": "${formatDate(secondFirstMonday)}"
  },
  "milena": {
    "meta_total": ${total_leads},
    "meta_primeira_quinzena": ${groupALeads},
    "meta_segunda_quinzena": ${groupBLeads},
    "meta_diaria_primeira": ${milenaDailyFirst},
    "meta_diaria_segunda": ${milenaDailySecond},
    "deadline_primeira_quinzena": "${formatDate(firstHalfDays[firstHalfDays.length - 1] || firstMonday)}",
    "deadline_segunda_quinzena": "${formatDate(secondHalfDays[secondHalfDays.length - 1] || secondFirstMonday)}"
  },
  "dias": [
    {
      "data": "YYYY-MM-DD",
      "dia_semana": "Segunda",
      "dia_util": true,
      "responsavel": "Aline",
      "ciclo_dia": 1,
      "grupo": "A",
      "aline_tarefas": [
        { "periodo": "Manhã", "tipo": "Email", "grupo": "A", "quantidade": 0, "descricao": "texto" }
      ],
      "milena_tarefas": [
        { "tipo": "Geração de Leads", "quantidade": 0, "descricao": "texto" }
      ]
    }
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um especialista em gestão comercial B2B. Retorne APENAS JSON válido, sem markdown, sem explicações." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos AI esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    const plan = JSON.parse(content);

    return new Response(JSON.stringify({ plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-cadence-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
