// Importa pipelines, stages, orgs, persons, deals, activities e notes do Pipedrive
// para as tabelas crm_*. Idempotente: re-rodar atualiza pelo pipedrive_id.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OWNER_LABEL_MAP: Record<string, string> = {
  aline: "Aline",
  milena: "Milena",
  felipe: "Felipe",
  thiago: "Thiago",
};

function ownerLabel(name: string | null | undefined): string | null {
  if (!name) return null;
  const lower = name.toLowerCase();
  for (const key of Object.keys(OWNER_LABEL_MAP)) {
    if (lower.includes(key)) return OWNER_LABEL_MAP[key];
  }
  return name;
}

async function pdGet(path: string, apiKey: string) {
  const sep = path.includes("?") ? "&" : "?";
  const url = `https://api.pipedrive.com/v1${path}${sep}api_token=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pipedrive ${path} → ${res.status}`);
  return await res.json();
}

async function pdPaginated(path: string, apiKey: string): Promise<any[]> {
  const out: any[] = [];
  let start = 0;
  while (true) {
    const sep = path.includes("?") ? "&" : "?";
    const j = await pdGet(`${path}${sep}start=${start}&limit=100`, apiKey);
    if (Array.isArray(j.data)) out.push(...j.data);
    if (!j.additional_data?.pagination?.more_items_in_collection) break;
    start = j.additional_data.pagination.next_start ?? start + 100;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const API_KEY = Deno.env.get("PIPEDRIVE_API_KEY");
    if (!API_KEY) throw new Error("PIPEDRIVE_API_KEY não configurada");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1) Pipelines
    const pipelinesRaw = await pdGet("/pipelines", API_KEY);
    const pipelines = pipelinesRaw.data || [];

    const pipelineIdMap = new Map<number, string>(); // pipedrive_id → crm uuid

    for (const p of pipelines) {
      const { data, error } = await supabase
        .from("crm_pipelines")
        .upsert(
          {
            nome: p.name,
            ordem: p.order_nr ?? 0,
            ativo: p.active !== false,
          },
          { onConflict: "nome" }
        )
        .select("id")
        .single();
      if (error) {
        // fallback: select existing
        const { data: existing } = await supabase
          .from("crm_pipelines")
          .select("id")
          .eq("nome", p.name)
          .maybeSingle();
        if (existing) pipelineIdMap.set(p.id, existing.id);
      } else if (data) {
        pipelineIdMap.set(p.id, data.id);
      }
    }

    // 2) Stages
    const stagesRaw = await pdGet("/stages", API_KEY);
    const stageIdMap = new Map<number, string>();
    for (const s of stagesRaw.data || []) {
      const crmPipelineId = pipelineIdMap.get(s.pipeline_id);
      if (!crmPipelineId) continue;
      const { data, error } = await supabase
        .from("crm_stages")
        .upsert(
          {
            pipeline_id: crmPipelineId,
            nome: s.name,
            ordem: s.order_nr ?? 0,
            pipedrive_stage_id: s.id,
          },
          { onConflict: "pipedrive_stage_id" }
        )
        .select("id")
        .single();
      if (data) stageIdMap.set(s.id, data.id);
    }

    // 3) Organizations
    const orgs = await pdPaginated("/organizations", API_KEY);
    const orgIdMap = new Map<number, string>();
    for (const o of orgs) {
      const { data } = await supabase
        .from("crm_organizations")
        .upsert(
          { nome: o.name || "Sem nome", pipedrive_org_id: o.id },
          { onConflict: "pipedrive_org_id" }
        )
        .select("id")
        .single();
      if (data) orgIdMap.set(o.id, data.id);
    }

    // 4) Persons
    const persons = await pdPaginated("/persons", API_KEY);
    const personIdMap = new Map<number, string>();
    for (const p of persons) {
      const email = Array.isArray(p.email) && p.email.length ? p.email[0].value : null;
      const phone = Array.isArray(p.phone) && p.phone.length ? p.phone[0].value : null;
      const orgUuid = p.org_id?.value ? orgIdMap.get(p.org_id.value) : null;
      const { data } = await supabase
        .from("crm_persons")
        .upsert(
          {
            nome: p.name || "Sem nome",
            email,
            telefone: phone,
            organization_id: orgUuid ?? null,
            pipedrive_person_id: p.id,
          },
          { onConflict: "pipedrive_person_id" }
        )
        .select("id")
        .single();
      if (data) personIdMap.set(p.id, data.id);
    }

    // 5) Deals (all_not_deleted from all pipelines)
    const deals = await pdPaginated("/deals?status=all_not_deleted", API_KEY);
    const dealIdMap = new Map<number, string>();
    for (const d of deals) {
      const pipelineUuid = pipelineIdMap.get(d.pipeline_id);
      const stageUuid = stageIdMap.get(d.stage_id);
      if (!pipelineUuid || !stageUuid) continue;
      const orgUuid = d.org_id?.value ? orgIdMap.get(d.org_id.value) : null;
      const personUuid = d.person_id?.value ? personIdMap.get(d.person_id.value) : null;
      const ownerName = d.user_id?.name || d.owner_name || null;
      const status = d.status === "won" ? "won" : d.status === "lost" ? "lost" : "open";

      const { data } = await supabase
        .from("crm_deals")
        .upsert(
          {
            pipeline_id: pipelineUuid,
            stage_id: stageUuid,
            organization_id: orgUuid ?? null,
            person_id: personUuid ?? null,
            titulo: d.title || `Deal #${d.id}`,
            valor: d.value || 0,
            owner_label: ownerLabel(ownerName),
            status,
            motivo_perda: d.lost_reason || null,
            expected_close_date: d.expected_close_date || null,
            data_fechamento: d.won_time || d.lost_time || null,
            stage_entered_at: d.stage_change_time || d.add_time,
            pipedrive_id: d.id,
            origem: "pipedrive",
          },
          { onConflict: "pipedrive_id" }
        )
        .select("id")
        .single();
      if (data) dealIdMap.set(d.id, data.id);
    }

    // 6) Activities
    const acts = await pdPaginated("/activities", API_KEY);
    let actsImported = 0;
    for (const a of acts) {
      const dealUuid = a.deal_id ? dealIdMap.get(a.deal_id) : null;
      const personUuid = a.person_id ? personIdMap.get(a.person_id) : null;
      const typeMap: Record<string, string> = {
        call: "ligacao",
        email: "email",
        meeting: "reuniao",
        task: "tarefa",
        deadline: "followup",
      };
      const tipo = typeMap[a.type] || "outro";
      const scheduledAt =
        a.due_date && a.due_time
          ? `${a.due_date}T${a.due_time}:00Z`
          : a.due_date
          ? `${a.due_date}T12:00:00Z`
          : null;

      const { error } = await supabase
        .from("crm_activities")
        .upsert(
          {
            deal_id: dealUuid ?? null,
            person_id: personUuid ?? null,
            owner_label: ownerLabel(a.owner_name || a.user_id?.name),
            tipo,
            titulo: a.subject || "Atividade",
            descricao: a.note || null,
            scheduled_at: scheduledAt,
            duracao_min: a.duration ? parseInt(String(a.duration).split(":")[0]) * 60 : null,
            concluida: !!a.done,
            concluida_em: a.marked_as_done_time || null,
            pipedrive_activity_id: a.id,
          },
          { onConflict: "pipedrive_activity_id" }
        );
      if (!error) actsImported++;
    }

    // 7) Notes (linked to deals)
    const notesRaw = await pdPaginated("/notes", API_KEY);
    let notesImported = 0;
    for (const n of notesRaw) {
      const dealUuid = n.deal_id ? dealIdMap.get(n.deal_id) : null;
      if (!dealUuid) continue;
      // notes have no unique upsert key; dedup by deal+content+created_at (best-effort)
      const { data: existing } = await supabase
        .from("crm_notes")
        .select("id")
        .eq("deal_id", dealUuid)
        .eq("created_at", n.add_time)
        .maybeSingle();
      if (existing) continue;
      await supabase.from("crm_notes").insert({
        deal_id: dealUuid,
        author_label: ownerLabel(n.user?.name),
        conteudo: (n.content || "").replace(/<[^>]+>/g, ""),
        created_at: n.add_time,
      });
      notesImported++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          pipelines: pipelineIdMap.size,
          stages: stageIdMap.size,
          organizations: orgIdMap.size,
          persons: personIdMap.size,
          deals: dealIdMap.size,
          activities: actsImported,
          notes: notesImported,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("import-pipedrive-once error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
