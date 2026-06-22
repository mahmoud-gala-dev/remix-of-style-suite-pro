import { createFileRoute } from "@tanstack/react-router";
import { createHmac } from "crypto";

function sign(secret: string, body: string): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true; // no secret configured → keep open (dev)
  const got = request.headers.get("x-cron-secret") ?? "";
  return got === expected;
}

// P15 — cron-driven retry processor. Picks pending failed deliveries due for retry,
// re-POSTs them, applies exponential backoff, and moves to DLQ after 5 attempts.
export const Route = createFileRoute("/api/public/cron/process-webhooks")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const nowIso = new Date().toISOString();
        const { data: rows, error } = await supabaseAdmin
          .from("webhook_deliveries")
          .select("id, webhook_id, event, payload, attempts, status")
          .eq("failed", false)
          .lte("next_retry_at", nowIso)
          .or("status.gte.500,status.eq.0")
          .limit(100);
        if (error) {
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500, headers: { "Content-Type": "application/json" },
          });
        }
        if (!rows?.length) {
          return Response.json({ ok: true, retried: 0, failed: 0 });
        }
        let retried = 0, dlq = 0;
        for (const row of rows) {
          if (!row.webhook_id) continue;
          const { data: hook } = await supabaseAdmin
            .from("webhooks").select("url, enabled, secret").eq("id", row.webhook_id).maybeSingle();
          if (!hook?.enabled) continue;
          const body = JSON.stringify({ event: row.event, payload: row.payload, ts: new Date().toISOString(), retry: true });
          const sig = hook.secret ? sign(hook.secret, body) : "";
          let status = 0, respBody = "";
          try {
            const res = await fetch(hook.url, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...(sig ? { "X-Vanguard-Signature": sig } : {}) },
              body,
            });
            status = res.status;
            respBody = (await res.text()).slice(0, 500);
          } catch (e) {
            respBody = e instanceof Error ? e.message : String(e);
          }
          const attempts = (row.attempts ?? 1) + 1;
          const ok = status >= 200 && status < 400;
          const giveUp = !ok && attempts >= 5;
          const backoffMs = Math.pow(2, attempts) * 60_000;
          await supabaseAdmin.from("webhook_deliveries").update({
            attempts, status, response: respBody,
            failed: giveUp,
            next_retry_at: !ok && !giveUp ? new Date(Date.now() + backoffMs).toISOString() : null,
          }).eq("id", row.id);
          if (giveUp) dlq++; else if (ok || !giveUp) retried++;
        }
        return Response.json({ ok: true, retried, dlq });
      },
    },
  },
});