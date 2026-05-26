// deno-lint-ignore-file no-explicit-any

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

// URL-safe base64 (no padding) — required by Gmail API's `raw` field.
function b64url(s: string): string {
  return btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Standard base64 for header encoding only.
function b64(s: string): string {
  return btoa(unescape(encodeURIComponent(s)));
}

// RFC 2047 encoded-word for header values containing non-ASCII characters.
function encodeHeader(value: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?UTF-8?B?${b64(value)}?=`;
}

function buildRaw(opts: {
  to: string; cc?: string; bcc?: string; subject: string; html: string;
  inReplyTo?: string; references?: string;
}) {
  const headers: string[] = [
    `From: me`,
    `To: ${opts.to}`,
  ];
  if (opts.cc) headers.push(`Cc: ${opts.cc}`);
  if (opts.bcc) headers.push(`Bcc: ${opts.bcc}`);
  headers.push(`Subject: ${encodeHeader(opts.subject)}`);
  headers.push(`Date: ${new Date().toUTCString()}`);
  headers.push(`Message-ID: <${crypto.randomUUID()}@palacios-os.local>`);
  headers.push(`MIME-Version: 1.0`);
  headers.push(`Content-Type: text/html; charset="UTF-8"`);
  if (opts.inReplyTo) headers.push(`In-Reply-To: ${opts.inReplyTo}`);
  if (opts.references) headers.push(`References: ${opts.references}`);

  // Body is plain HTML — Gmail will accept it as-is. The b64url wrap at the
  // end handles transport encoding so the HTML can contain any UTF-8.
  const mime = headers.join("\r\n") + "\r\n\r\n" + opts.html;
  return { raw: b64url(mime), mime };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const GMAIL_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY");
  if (!LOVABLE_API_KEY || !GMAIL_KEY) {
    return new Response(JSON.stringify({ error: "Missing secrets" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { mode = "send", to, cc, bcc, subject, html, threadId, inReplyTo, references } = await req.json();
    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: "to, subject, html required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { raw, mime } = buildRaw({ to, cc, bcc, subject, html, inReplyTo, references });

    console.log("[gmail-send] MIME being sent:\n" + mime);
    console.log("[gmail-send] raw length:", raw.length);

    const path = mode === "draft" ? "/users/me/drafts" : "/users/me/messages/send";
    const body = mode === "draft"
      ? { message: { raw, ...(threadId ? { threadId } : {}) } }
      : { raw, ...(threadId ? { threadId } : {}) };

    const r = await fetch(`${GATEWAY}${path}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GMAIL_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await r.json();
    console.log("[gmail-send] Gmail response status:", r.status, "body:", JSON.stringify(data));

    if (!r.ok) {
      return new Response(JSON.stringify({ error: data }), {
        status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[gmail-send] error:", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
