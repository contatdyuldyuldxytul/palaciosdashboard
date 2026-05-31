// Shared helpers for Evolution API calls
export const EVOLUTION_URL = (Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/$/, "");
export const EVOLUTION_KEY = Deno.env.get("EVOLUTION_API_KEY") || "";
export const WEBHOOK_TOKEN = Deno.env.get("EVOLUTION_WEBHOOK_TOKEN") || "";
export const PROJECT_REF = Deno.env.get("SUPABASE_URL")?.match(/https:\/\/([^.]+)/)?.[1] || "";
export const WEBHOOK_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/evolution-webhook`;

export async function evo(
  path: string,
  init: RequestInit & { instanceKey?: string } = {},
) {
  if (!EVOLUTION_URL || !EVOLUTION_KEY) {
    throw new Error("EVOLUTION_API_URL / EVOLUTION_API_KEY not configured");
  }
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("apikey", init.instanceKey || EVOLUTION_KEY);

  const url = `${EVOLUTION_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    throw new Error(`Evolution ${res.status} on ${path}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
  }
  return body;
}

export function normalizePhone(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  // Brazilian default if 10/11 digits with no country code
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

export function jidToPhone(jid: string): string {
  return (jid || "").split("@")[0]?.split(":")[0] || "";
}
