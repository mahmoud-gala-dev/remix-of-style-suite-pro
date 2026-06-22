/**
 * Postgres-backed report cache (substitute for Redis/KV on Lovable Cloud).
 *
 * Cycle #16 — Enterprise step 1: skip recomputing expensive report aggregates
 * on every request by storing the JSON payload keyed by (report-name + range +
 * branch) with a TTL. All access goes through `supabaseAdmin` so RLS stays
 * fully closed on `report_cache`.
 *
 * Failure mode: any cache error degrades to "miss" — never throws — so a flaky
 * cache never breaks the report itself.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  try {
    const { data } = await supabaseAdmin
      .from("report_cache")
      .select("payload, expires_at")
      .eq("key", key)
      .maybeSingle();
    if (data && new Date(data.expires_at).getTime() > Date.now()) {
      return data.payload as T;
    }
  } catch {
    /* cache read failed — fall through to recompute */
  }
  const fresh = await loader();
  const expires = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  try {
    await supabaseAdmin
      .from("report_cache")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert({ key, payload: fresh as any, expires_at: expires });
  } catch {
    /* cache write failed — return value anyway */
  }
  return fresh;
}

/** Build a stable cache key for report queries. */
export function reportKey(
  name: string,
  parts: Record<string, string | number | null | undefined>,
): string {
  const ordered = Object.keys(parts)
    .sort()
    .map((k) => `${k}=${parts[k] ?? ""}`)
    .join("&");
  return `${name}|${ordered}`;
}