// Importa pipelines, stages, orgs, persons, deals, activities, notes, mail e changelog do Pipedrive.
// Idempotente. Por causa do volume, suporta execução por fase via ?phase=
// Fases: pipelines | stages | orgs | persons | deals | activities | notes | mail | history | all
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OWNER_LABEL_MAP: Record<string, string> = {
  aline: "Aline", milena: "Milena", felipe: "Felipe", thiago: "Thiago",
};

function ownerLabel(name: string | null | undefined): string | null {
  if (!name) return null;
  const lower = name.toLowerCase();
  for (const key of Object.keys(OWNER_LABEL_MAP)) {
    if (lower.includes(key)) return OWNER_LABEL_MAP[key];
  }
  return name;
}

async function pdGet(path: string, apiKey: string): Promise<any> {
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
    const j = await pdGet(`${path}${sep}start=${start}&limit=500`, apiKey);
    if (Array.isArray(j.data)) out.push(...j.data);
    if (!j.additional_data?.pagination?.more_items_in_collection) break;
    start = j.additional_data.pagination.next_start ?? start + 500;
  }
  return out;
}

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const API_KEY = Deno.env.get("PIPEDRIVE_API_KEY");
    if (!API_KEY) throw new Error("PIPEDRIVE_API_KEY não configurada");

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const phase = url.searchParams.get("phase") || "all";
    const summary: Record<string, any> = { phase };
    const t0 = Date.now();

    // helper: maps from DB
    async function buildMap(table: string, key: string): Promise<Map<number, string>> {
      const m = new Map<number, string>();
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await sb.from(table).select(`id, ${key}`).not(key, "is", null).range(from, from + PAGE - 1);
        if (error || !data || data.length === 0) break;
        for (const r of data as any[]) m.set(r[key], r.id);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return m;
    }

    // ─── PIPELINES ───
    if (phase === "all" || phase === "pipelines") {
      const j = await pdGet("/pipelines", API_KEY);
      const rows = (j.data || []).map((p: any) => ({
        nome: p.name, ordem: p.order_nr ?? 0, ativo: p.active !== false,
      }));
      // pipelines doesn't have pipedrive_id col; upsert by nome (existing onConflict)
      await sb.from("crm_pipelines").upsert(rows, { onConflict: "nome" });
      summary.pipelines = rows.length;
    }

    // ─── STAGES ───
    if (phase === "all" || phase === "stages") {
      const j = await pdGet("/stages", API_KEY);
      // need pipeline uuid map
      const { data: pipes } = await sb.from("crm_pipelines").select("id, nome");
      const pipeByName = new Map<string, string>();
      // also fetch pipedrive pipelines to map id→name
      const pj = await pdGet("/pipelines", API_KEY);
      const pdPipeName = new Map<number, string>();
      for (const p of pj.data || []) pdPipeName.set(p.id, p.name);
      for (const p of pipes || []) pipeByName.set((p as any).nome, (p as any).id);
      const rows = (j.data || [])
        .map((s: any) => {
          const pipeName = pdPipeName.get(s.pipeline_id);
          const pipeUuid = pipeName ? pipeByName.get(pipeName) : null;
          if (!pipeUuid) return null;
          return {
            pipeline_id: pipeUuid, nome: s.name, ordem: s.order_nr ?? 0,
            pipedrive_stage_id: s.id,
          };
        })
        .filter(Boolean);
      await sb.from("crm_stages").upsert(rows as any[], { onConflict: "pipedrive_stage_id" });
      summary.stages = rows.length;
    }

    // ─── ORGANIZATIONS ───
    if (phase === "all" || phase === "orgs") {
      const orgs = await pdPaginated("/organizations", API_KEY);
      const rows = orgs.map((o: any) => ({
        nome: o.name || "Sem nome", pipedrive_org_id: o.id,
      }));
      let imported = 0;
      for (const batch of chunks(rows, 500)) {
        const { error } = await sb.from("crm_organizations").upsert(batch, { onConflict: "pipedrive_org_id" });
        if (!error) imported += batch.length;
      }
      summary.orgs = imported;
    }

    // ─── PERSONS ───
    if (phase === "all" || phase === "persons") {
      const orgMap = await buildMap("crm_organizations", "pipedrive_org_id");
      const persons = await pdPaginated("/persons", API_KEY);
      const rows = persons.map((p: any) => {
        const email = Array.isArray(p.email) && p.email.length ? p.email[0].value : null;
        const phone = Array.isArray(p.phone) && p.phone.length ? p.phone[0].value : null;
        const orgUuid = p.org_id?.value ? orgMap.get(p.org_id.value) : null;
        return {
          nome: p.name || "Sem nome", email, telefone: phone,
          organization_id: orgUuid ?? null, pipedrive_person_id: p.id,
        };
      });
      let imported = 0;
      for (const batch of chunks(rows, 500)) {
        const { error } = await sb.from("crm_persons").upsert(batch, { onConflict: "pipedrive_person_id" });
        if (!error) imported += batch.length;
      }
      summary.persons = imported;
    }

    // ─── DEALS (open/won/lost + deleted) ───
    if (phase === "all" || phase === "deals") {
      const orgMap = await buildMap("crm_organizations", "pipedrive_org_id");
      const personMap = await buildMap("crm_persons", "pipedrive_person_id");
      const stageMap = await buildMap("crm_stages", "pipedrive_stage_id");
      // pipeline uuid via stage→pipeline_id
      const { data: stagesData } = await sb.from("crm_stages").select("id, pipeline_id");
      const stageToPipeline = new Map<string, string>();
      for (const s of stagesData || []) stageToPipeline.set((s as any).id, (s as any).pipeline_id);

      const open = await pdPaginated("/deals?status=all_not_deleted", API_KEY);
      let deleted: any[] = [];
      try { deleted = await pdPaginated("/deals?status=deleted", API_KEY); } catch (e) { console.warn("deleted deals fail:", e); }
      const all = [
        ...open.map((d: any) => ({ ...d, _deleted: false })),
        ...deleted.map((d: any) => ({ ...d, _deleted: true })),
      ];
      const rows = all.map((d: any) => {
        const stageUuid = stageMap.get(d.stage_id);
        if (!stageUuid) return null;
        const pipelineUuid = stageToPipeline.get(stageUuid);
        if (!pipelineUuid) return null;
        const orgUuid = d.org_id?.value ? orgMap.get(d.org_id.value) : null;
        const personUuid = d.person_id?.value ? personMap.get(d.person_id.value) : null;
        const ownerName = d.user_id?.name || d.owner_name || null;
        let status: string = d.status === "won" ? "won" : d.status === "lost" ? "lost" : "open";
        if (d._deleted) status = "lost";
        return {
          pipeline_id: pipelineUuid, stage_id: stageUuid,
          organization_id: orgUuid ?? null, person_id: personUuid ?? null,
          titulo: d.title || `Deal #${d.id}`, valor: d.value || 0,
          owner_label: ownerLabel(ownerName), status,
          motivo_perda: d._deleted ? "[deletado no Pipedrive]" : d.lost_reason || null,
          expected_close_date: d.expected_close_date || null,
          data_fechamento: d.won_time || d.lost_time || null,
          stage_entered_at: d.stage_change_time || d.add_time,
          pipedrive_id: d.id, origem: "pipedrive",
          deleted_in_pipedrive: !!d._deleted,
        };
      }).filter(Boolean);
      let imported = 0;
      for (const batch of chunks(rows as any[], 500)) {
        const { error } = await sb.from("crm_deals").upsert(batch, { onConflict: "pipedrive_id" });
        if (!error) imported += batch.length;
        else console.warn("deal batch err:", error.message);
      }
      summary.deals = imported;
      summary.deleted_deals = deleted.length;
    }

    // ─── ACTIVITIES ───
    if (phase === "all" || phase === "activities") {
      const dealMap = await buildMap("crm_deals", "pipedrive_id");
      const personMap = await buildMap("crm_persons", "pipedrive_person_id");
      const acts = await pdPaginated("/activities", API_KEY);
      const typeMap: Record<string, string> = {
        call: "ligacao", email: "email", meeting: "reuniao", task: "tarefa", deadline: "followup",
      };
      const rows = acts.map((a: any) => {
        const scheduledAt = a.due_date && a.due_time
          ? `${a.due_date}T${a.due_time}:00Z`
          : a.due_date ? `${a.due_date}T12:00:00Z` : null;
        return {
          deal_id: (a.deal_id ? dealMap.get(a.deal_id) : null) ?? null,
          person_id: (a.person_id ? personMap.get(a.person_id) : null) ?? null,
          owner_label: ownerLabel(a.owner_name || a.user_id?.name),
          tipo: typeMap[a.type] || "outro",
          titulo: a.subject || "Atividade",
          descricao: a.note || null,
          scheduled_at: scheduledAt,
          duracao_min: a.duration ? parseInt(String(a.duration).split(":")[0]) * 60 : null,
          concluida: !!a.done,
          concluida_em: a.marked_as_done_time || null,
          pipedrive_activity_id: a.id,
        };
      });
      let imported = 0;
      for (const batch of chunks(rows, 500)) {
        const { error } = await sb.from("crm_activities").upsert(batch, { onConflict: "pipedrive_activity_id" });
        if (!error) imported += batch.length;
      }
      summary.activities = imported;
    }

    // ─── NOTES ───
    if (phase === "all" || phase === "notes") {
      const dealMap = await buildMap("crm_deals", "pipedrive_id");
      const notesRaw = await pdPaginated("/notes", API_KEY);
      // dedupe via in-memory check then bulk insert
      const rows = notesRaw
        .map((n: any) => {
          const dealUuid = n.deal_id ? dealMap.get(n.deal_id) : null;
          if (!dealUuid) return null;
          return {
            deal_id: dealUuid,
            author_label: ownerLabel(n.user?.name),
            conteudo: (n.content || "").replace(/<[^>]+>/g, ""),
            created_at: n.add_time,
          };
        })
        .filter(Boolean) as any[];
      let imported = 0;
      // dedup against existing
      const { data: existing } = await sb.from("crm_notes").select("deal_id, created_at");
      const seen = new Set((existing || []).map((e: any) => `${e.deal_id}|${e.created_at}`));
      const fresh = rows.filter((r: any) => !seen.has(`${r.deal_id}|${r.created_at}`));
      for (const batch of chunks(fresh, 500)) {
        const { error } = await sb.from("crm_notes").insert(batch);
        if (!error) imported += batch.length;
      }
      summary.notes = imported;
    }

    // ─── MAIL ───
    if (phase === "all" || phase === "mail") {
      const dealMap = await buildMap("crm_deals", "pipedrive_id");
      const personMap = await buildMap("crm_persons", "pipedrive_person_id");
      let imported = 0;
      let partial = false;
      const allRows: any[] = [];
      for (const folder of ["inbox", "sent", "archive"]) {
        let threads: any[] = [];
        try { threads = await pdPaginated(`/mailbox/mailThreads?folder=${folder}`, API_KEY); }
        catch (e) { console.warn(`threads ${folder}:`, e); partial = true; continue; }
        // fetch messages per thread, batches of 8 parallel
        for (const batch of chunks(threads, 8)) {
          await Promise.all(batch.map(async (t: any) => {
            try {
              const r = await pdGet(`/mailbox/mailThreads/${t.id}/mailMessages`, API_KEY);
              const msgs = r.data || [];
              const dealUuid = t.deal_id ? dealMap.get(t.deal_id) : null;
              const personUuid = t.person_id ? personMap.get(t.person_id) : null;
              for (const m of msgs) {
                const fromArr = Array.isArray(m.from) ? m.from : [];
                const toArr = Array.isArray(m.to) ? m.to : [];
                const ccArr = Array.isArray(m.cc) ? m.cc : [];
                const direction = m.message_type === 1 || folder === "sent" ? "sent" : "received";
                allRows.push({
                  gmail_message_id: `pd_${m.id}`,
                  gmail_thread_id: `pd_${t.id}`,
                  direction,
                  from_email: fromArr[0]?.email_address || null,
                  from_name: fromArr[0]?.name || null,
                  to_emails: toArr.map((x: any) => x.email_address).filter(Boolean),
                  cc_emails: ccArr.map((x: any) => x.email_address).filter(Boolean),
                  subject: m.subject || t.subject || null,
                  snippet: m.snippet || null,
                  body_html: m.body || null,
                  raw_payload: m,
                  person_id: personUuid ?? null,
                  deal_id: dealUuid ?? null,
                  labels: [folder],
                  is_read: !!m.read_flag,
                  received_at: m.add_time || t.add_time || new Date().toISOString(),
                });
              }
            } catch (e) { partial = true; }
          }));
        }
      }
      for (const batch of chunks(allRows, 500)) {
        const { error } = await sb.from("email_messages").upsert(batch, { onConflict: "gmail_message_id" });
        if (!error) imported += batch.length;
      }
      summary.mail_messages = imported;
      summary.mail_partial = partial;
    }

    // ─── HISTORY (deal changelog) ───
    if (phase === "all" || phase === "history") {
      const dealMap = await buildMap("crm_deals", "pipedrive_id");
      const entries = Array.from(dealMap.entries());
      let imported = 0;
      let partial = false;
      const allHistory: any[] = [];
      // parallel batches of 10
      for (const batch of chunks(entries, 10)) {
        await Promise.all(batch.map(async ([pdId, uuid]) => {
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
              allHistory.push({
                deal_id: uuid, evento: "pipedrive_change", payload, created_at: payload.time,
              });
            }
          } catch (e) {
            const msg = String((e as Error)?.message || e);
            if (msg.includes("429")) partial = true;
          }
        }));
        // flush periodically to avoid huge memory
        if (allHistory.length >= 1000) {
          for (const b of chunks(allHistory.splice(0), 500)) {
            const { error } = await sb.from("crm_deal_history").insert(b);
            if (!error) imported += b.length;
            // unique index will block dups, error.code === '23505' is expected on re-runs
          }
        }
      }
      // flush remaining
      for (const b of chunks(allHistory, 500)) {
        const { error } = await sb.from("crm_deal_history").insert(b);
        if (!error) imported += b.length;
      }
      summary.history_entries = imported;
      summary.history_partial = partial;
    }

    summary.elapsed_ms = Date.now() - t0;
    return new Response(JSON.stringify({ success: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("import-pipedrive-once error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
