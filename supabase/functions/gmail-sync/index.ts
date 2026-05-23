// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

function b64urlDecode(s: string): string {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    return new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
  } catch {
    return "";
  }
}

function extractBody(payload: any): { html: string; text: string } {
  let html = "";
  let text = "";
  const walk = (p: any) => {
    if (!p) return;
    if (p.body?.data) {
      if (p.mimeType === "text/html") html ||= b64urlDecode(p.body.data);
      if (p.mimeType === "text/plain") text ||= b64urlDecode(p.body.data);
    }
    if (Array.isArray(p.parts)) p.parts.forEach(walk);
  };
  walk(payload);
  return { html, text };
}

function header(headers: any[], name: string): string {
  const h = headers?.find((x) => x.name?.toLowerCase() === name.toLowerCase());
  return h?.value || "";
}

function parseAddr(s: string): { email: string; name: string } {
  const m = s.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim(), email: m[2].trim().toLowerCase() };
  return { name: "", email: s.trim().toLowerCase() };
}

function splitAddrs(s: string): string[] {
  if (!s) return [];
  return s.split(",").map((x) => parseAddr(x).email).filter(Boolean);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const GMAIL_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY");
  if (!LOVABLE_API_KEY || !GMAIL_KEY) {
    return new Response(JSON.stringify({ error: "Missing connector secrets" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const gw = async (path: string) => {
    const r = await fetch(`${GATEWAY}${path}`, {
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GMAIL_KEY,
      },
    });
    if (!r.ok) throw new Error(`Gmail ${path} ${r.status}: ${await r.text()}`);
    return r.json();
  };

  try {
    const body = await req.json().catch(() => ({}));
    const maxResults = Math.min(body.maxResults ?? 30, 100);

    // Get profile email to know "self"
    const profile = await gw(`/users/me/profile`);
    const selfEmail = (profile.emailAddress || "").toLowerCase();

    const list = await gw(`/users/me/messages?maxResults=${maxResults}`);
    const messages = list.messages || [];

    // Persons lookup for matching
    const { data: persons } = await supabase.from("crm_persons").select("id,email,organization_id");
    const personByEmail = new Map<string, any>();
    (persons || []).forEach((p: any) => p.email && personByEmail.set(p.email.toLowerCase(), p));

    // Deals: latest open deal per person
    const { data: deals } = await supabase.from("crm_deals").select("id,person_id,updated_at,status").order("updated_at", { ascending: false });
    const dealByPerson = new Map<string, string>();
    (deals || []).forEach((d: any) => {
      if (d.person_id && !dealByPerson.has(d.person_id)) dealByPerson.set(d.person_id, d.id);
    });

    let imported = 0, skipped = 0;
    const replyMatches: Array<{ email: string; received_at: string }> = [];

    for (const m of messages) {
      const { data: existing } = await supabase.from("email_messages").select("id").eq("gmail_message_id", m.id).maybeSingle();
      if (existing) { skipped++; continue; }

      const full = await gw(`/users/me/messages/${m.id}?format=full`);
      const headers = full.payload?.headers || [];
      const fromRaw = header(headers, "From");
      const toRaw = header(headers, "To");
      const ccRaw = header(headers, "Cc");
      const subject = header(headers, "Subject");
      const dateRaw = header(headers, "Date");
      const received_at = dateRaw ? new Date(dateRaw).toISOString() : new Date(parseInt(full.internalDate || "0")).toISOString();
      const from = parseAddr(fromRaw);
      const toList = splitAddrs(toRaw);
      const ccList = splitAddrs(ccRaw);
      const direction = from.email === selfEmail ? "out" : "in";
      const { html, text } = extractBody(full.payload);

      // Match counterpart
      const counterparts = direction === "in" ? [from.email] : toList;
      let personMatch: any = null;
      for (const e of counterparts) {
        const p = personByEmail.get(e);
        if (p) { personMatch = p; break; }
      }
      const dealMatch = personMatch ? dealByPerson.get(personMatch.id) : null;

      await supabase.from("email_messages").insert({
        gmail_message_id: m.id,
        gmail_thread_id: full.threadId,
        direction,
        from_email: from.email,
        from_name: from.name,
        to_emails: toList,
        cc_emails: ccList,
        subject,
        snippet: full.snippet,
        body_html: html,
        body_text: text,
        received_at,
        is_read: !(full.labelIds || []).includes("UNREAD"),
        labels: full.labelIds || [],
        person_id: personMatch?.id || null,
        deal_id: dealMatch || null,
      });
      imported++;

      if (direction === "in" && from.email) {
        replyMatches.push({ email: from.email, received_at });
      }
    }

    // Cancel active enrollments where the person replied
    for (const r of replyMatches) {
      const p = personByEmail.get(r.email);
      if (!p) continue;
      await supabase.from("email_sequence_enrollments")
        .update({ status: "cancelled_replied", cancelled_reason: "Lead respondeu o e-mail" })
        .eq("person_id", p.id)
        .eq("status", "active")
        .lt("started_at", r.received_at);
    }

    return new Response(JSON.stringify({ imported, skipped, self: selfEmail }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
