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

    // 5) Deals (open/won/lost + deleted from trash)
    const deals = await pdPaginated("/deals?status=all_not_deleted", API_KEY);
    let deletedDeals: any[] = [];
    try {
      deletedDeals = await pdPaginated("/deals?status=deleted", API_KEY);
    } catch (e) {
      console.warn("Could not fetch deleted deals:", e);
    }
    const dealIdMap = new Map<number, string>();
    const allDeals = [
      ...deals.map((d: any) => ({ ...d, _deleted: false })),
      ...deletedDeals.map((d: any) => ({ ...d, _deleted: true })),
    ];
    let deletedImported = 0;
    for (const d of allDeals) {
      const pipelineUuid = pipelineIdMap.get(d.pipeline_id);
      const stageUuid = stageIdMap.get(d.stage_id);
      if (!pipelineUuid || !stageUuid) continue;
      const orgUuid = d.org_id?.value ? orgIdMap.get(d.org_id.value) : null;
      const personUuid = d.person_id?.value ? personIdMap.get(d.person_id.value) : null;
      const ownerName = d.user_id?.name || d.owner_name || null;
      let status: string = d.status === "won" ? "won" : d.status === "lost" ? "lost" : "open";
      if (d._deleted) status = "lost";

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
            motivo_perda: d._deleted ? "[deletado no Pipedrive]" : d.lost_reason || null,
            expected_close_date: d.expected_close_date || null,
            data_fechamento: d.won_time || d.lost_time || null,
            stage_entered_at: d.stage_change_time || d.add_time,
            pipedrive_id: d.id,
            origem: "pipedrive",
            deleted_in_pipedrive: !!d._deleted,
          },
          { onConflict: "pipedrive_id" }
        )
        .select("id")
        .single();
      if (data) {
        dealIdMap.set(d.id, data.id);
        if (d._deleted) deletedImported++;
      }
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

    // 8) Mail messages (inbox + sent) — links by deal_id / person_id when available
    let mailImported = 0;
    let mailPartial = false;
    const personByPdId = new Map<number, string>();
    for (const [pdId, uuid] of personIdMap) personByPdId.set(pdId, uuid);
    try {
      for (const folder of ["inbox", "sent", "archive"]) {
        let threads: any[] = [];
        try {
          threads = await pdPaginated(`/mailbox/mailThreads?folder=${folder}`, API_KEY);
        } catch (e) {
          console.warn(`mailThreads ${folder} failed:`, e);
          mailPartial = true;
          continue;
        }
        for (const t of threads) {
          let msgs: any[] = [];
          try {
            const r = await pdGet(`/mailbox/mailThreads/${t.id}/mailMessages`, API_KEY);
            msgs = r.data || [];
          } catch (e) {
            mailPartial = true;
            continue;
          }
          const dealUuid = t.deal_id ? dealIdMap.get(t.deal_id) : null;
          const personUuid = t.person_id ? personByPdId.get(t.person_id) : null;
          for (const m of msgs) {
            const fromArr = Array.isArray(m.from) ? m.from : [];
            const toArr = Array.isArray(m.to) ? m.to : [];
            const ccArr = Array.isArray(m.cc) ? m.cc : [];
            const direction = m.message_type === 1 || folder === "sent" ? "sent" : "received";
            const row = {
              gmail_message_id: `pd_${m.id}`,
              gmail_thread_id: `pd_${t.id}`,
              direction,
              from_email: fromArr[0]?.email_address || null,
              from_name: fromArr[0]?.name || null,
              to_emails: toArr.map((x: any) => x.email_address).filter(Boolean),
              cc_emails: ccArr.map((x: any) => x.email_address).filter(Boolean),
              subject: m.subject || t.subject || null,
              snippet: m.snippet || null,
              body_html: m.body_url ? null : (m.body || null),
              body_text: null,
              raw_payload: m,
              person_id: personUuid ?? null,
              deal_id: dealUuid ?? null,
              labels: [folder],
              is_read: !!m.read_flag,
              received_at: m.add_time || t.add_time || new Date().toISOString(),
            };
            const { error } = await supabase
              .from("email_messages")
              .upsert(row, { onConflict: "gmail_message_id" });
            if (!error) mailImported++;
          }
        }
      }
    } catch (e) {
      console.warn("mail block failed:", e);
      mailPartial = true;
    }

    // 9) Deal flow / changelog — runs in batches of 10 parallel
    let historyImported = 0;
    let historyPartial = false;
    const dealEntries = Array.from(dealIdMap.entries());
    const BATCH = 10;
    for (let i = 0; i < dealEntries.length; i += BATCH) {
      const batch = dealEntries.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async ([pdId, uuid]) => {
          try {
            const r = await pdGet(`/deals/${pdId}/flow?items=dealChange`, API_KEY);
            const items = r.data || [];
            for (const it of items) {
              if (it.object !== "dealChange") continue;
              const d = it.data || {};
              const payload = {
                field: d.field_key || d.field || null,
                old_value: d.old_value ?? null,
                new_value: d.new_value ?? null,
                time: d.log_time || d.add_time || null,
                user: d.user_id ?? null,
              };
              if (!payload.field || !payload.time) continue;
              const { error } = await supabase.from("crm_deal_history").insert({
                deal_id: uuid,
                evento: "pipedrive_change",
                payload,
                created_at: payload.time,
              });
              if (!error) historyImported++;
              // ignore unique-conflict errors (re-runs)
            }
          } catch (e) {
            const msg = String((e as Error)?.message || e);
            if (msg.includes("429")) historyPartial = true;
          }
        })
      );
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
          deleted_deals: deletedImported,
          activities: actsImported,
          notes: notesImported,
          mail_messages: mailImported,
          mail_partial: mailPartial,
          history_entries: historyImported,
          history_partial: historyPartial,
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
