// Server-only helper: verifies a Bearer API key, returns the owning tenant_id,
// rate-limits per-key, and updates last_used_at. Used by /api/public/v1/* routes.

import { rateLimit } from "@/lib/rate-limit";

export type ApiKeyContext = {
  keyId: string;
  tenantId: string;
  scopes: string[];
};

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(buf));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function unauthorized(detail: string): Response {
  return Response.json({ error: "unauthorized", detail }, { status: 401 });
}

/**
 * Validate `Authorization: Bearer vk_<prefix>_<secret>`.
 * Returns either a 401/403/429 Response (caller must `return` it) or an
 * authenticated context with the tenant + scopes for downstream queries.
 */
export async function verifyApiKey(
  request: Request,
  requiredScope: "read" | "write",
): Promise<Response | ApiKeyContext> {
  const header = request.headers.get("authorization") ?? "";
  const m = header.match(/^Bearer\s+(vk_[A-Za-z0-9]+_[A-Za-z0-9]+)$/);
  if (!m) return unauthorized("missing or malformed bearer token");
  const full = m[1];
  const parts = full.split("_");
  if (parts.length !== 3) return unauthorized("invalid key format");
  const prefix = `${parts[0]}_${parts[1]}`;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row, error } = await supabaseAdmin
    .from("api_keys")
    .select("id,tenant_id,key_hash,scopes,rate_limit_per_min,revoked_at")
    .eq("prefix", prefix)
    .maybeSingle();
  if (error || !row) return unauthorized("unknown key");
  if (row.revoked_at) return unauthorized("key revoked");

  const hash = await sha256Hex(full);
  if (hash !== row.key_hash) return unauthorized("invalid key");

  if (!row.scopes.includes(requiredScope)) {
    return Response.json({ error: "forbidden", detail: `missing scope: ${requiredScope}` }, { status: 403 });
  }

  try {
    await rateLimit(`apikey:${row.id}`, {
      capacity: row.rate_limit_per_min,
      refillPerMin: row.rate_limit_per_min,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  // Best-effort last_used_at stamp (do not await failure).
  void supabaseAdmin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id);

  return { keyId: row.id, tenantId: row.tenant_id, scopes: row.scopes };
}

/** Generate a new API key. Returns plaintext (show once) + storable fields. */
export async function mintApiKey(): Promise<{ plaintext: string; prefix: string; keyHash: string }> {
  const prefixBytes = new Uint8Array(4);
  const secretBytes = new Uint8Array(24);
  crypto.getRandomValues(prefixBytes);
  crypto.getRandomValues(secretBytes);
  const toHex = (b: Uint8Array) =>
    Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
  const prefix = `vk_${toHex(prefixBytes)}`;
  const plaintext = `${prefix}_${toHex(secretBytes)}`;
  const keyHash = await sha256Hex(plaintext);
  return { plaintext, prefix, keyHash };
}