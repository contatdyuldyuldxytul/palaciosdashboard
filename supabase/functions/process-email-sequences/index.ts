// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

function b64url(s: string): string {
  return btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function render(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / 86400000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const GMAIL_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY");
  if (!LOVABLE_API_KEY || !GMAIL_KEY) {
    return new Response(JSON.stringify({ error: "Missing secrets" }), { status: 500, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: enrollments } = await supabase
      .from("email_sequence_enrollments")
      .select("*, sequence:email_sequences(*), person:crm_persons(id,nome,email,organization_id), deal:crm_deals(id,titulo,owner_label)")
      .eq("status", "active");

    let created = 0, skipped = 0, errors = 0;
    const today = new Date();

    for (const enr of enrollments || []) {
      if (!enr.sequence?.ativo) continue;
      const { data: steps } = await supabase
        .from("email_sequence_steps")
        .select("*")
        .eq("sequence_id", enr.sequence_id)
        .order("ordem");
      if (!steps?.length) continue;

      const elapsed = daysBetween(new Date(enr.started_at), today);
      let lastStepIdx = enr.current_step;

      for (let i = enr.current_step; i < steps.length; i++) {
        const step = steps[i];
        if (step.dia_offset > elapsed) break;

        // Check if draft already exists
        const { data: existing } = await supabase
          .from("email_sequence_drafts")
          .select("id")
          .eq("enrollment_id", enr.id).eq("step_id", step.id).maybeSingle();
        if (existing) { skipped++; lastStepIdx = i + 1; continue; }

        if (!enr.person?.email) {
          await supabase.from("email_sequence_drafts").insert({
            enrollment_id: enr.id, step_id: step.id,
            scheduled_for: today.toISOString().slice(0, 10),
            status: "skipped", error_message: "Sem e-mail do contato",
          });
          skipped++; lastStepIdx = i + 1; continue;
        }

        // Fetch organization name
        let empresaNome = "";
        if (enr.person.organization_id) {
          const { data: org } = await supabase.from("crm_organizations").select("nome").eq("id", enr.person.organization_id).maybeSingle();
          empresaNome = org?.nome || "";
        }

        const vars = {
          lead_nome: enr.person.nome || "",
          lead_email: enr.person.email || "",
          lead_empresa: empresaNome,
          responsavel_nome: enr.deal?.owner_label || "",
          deal_titulo: enr.deal?.titulo || "",
        };
        const subject = render(step.subject_template, vars);
        const bodyHtml = render(step.body_template, vars).replace(/\n/g, "<br>");

        const raw = b64url([
          `To: ${enr.person.email}`,
          `Subject: ${subject}`,
          `MIME-Version: 1.0`,
          `Content-Type: text/html; charset="UTF-8"`,
          "", bodyHtml,
        ].join("\r\n"));

        try {
          const r = await fetch(`${GATEWAY}/users/me/drafts`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": GMAIL_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ message: { raw } }),
          });
          const data = await r.json();
          if (!r.ok) throw new Error(JSON.stringify(data));

          await supabase.from("email_sequence_drafts").insert({
            enrollment_id: enr.id, step_id: step.id,
            scheduled_for: today.toISOString().slice(0, 10),
            gmail_draft_id: data.id,
            rendered_subject: subject,
            rendered_body: bodyHtml,
            recipient_email: enr.person.email,
            status: "draft_created",
          });
          created++;
          lastStepIdx = i + 1;
        } catch (err: any) {
          errors++;
          await supabase.from("email_sequence_drafts").insert({
            enrollment_id: enr.id, step_id: step.id,
            scheduled_for: today.toISOString().slice(0, 10),
            status: "failed", error_message: String(err?.message || err),
          });
          break;
        }
      }

      const newStatus = lastStepIdx >= steps.length ? "completed" : "active";
      await supabase.from("email_sequence_enrollments")
        .update({ current_step: lastStepIdx, status: newStatus })
        .eq("id", enr.id);
    }

    return new Response(JSON.stringify({ created, skipped, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
