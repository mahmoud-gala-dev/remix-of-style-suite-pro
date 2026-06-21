import { createFileRoute } from "@tanstack/react-router";

// P47 — Called by pg_cron every minute. Retries failed webhook deliveries
// (status >= 500 OR status == 0) up to 3 times with exponential backoff.
export const Route = createFileRoute("/api/public/cron/retry-webhooks")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const nowIso = new Date().toISOString();
        const { data: rows } = await supabaseAdmin
          .from("webhook_deliveries")
          .select("id, webhook_id, event, payload, attempts, status")
          .eq("failed", false)
          .lte("next_retry_at", nowIso)
          .or("status.gte.500,status.eq.0")
          .limit(100);

        let retried = 0;
        let failed = 0;
        for (const row of rows ?? []) {
          if (!row.webhook_id) continue;
          const { data: hook } = await supabaseAdmin
            .from("webhooks").select("url, enabled").eq("id", row.webhook_id).maybeSingle();
          if (!hook?.enabled) continue;

          let status = 0;
          let body = "";
          try {
            const res = await fetch(hook.url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ event: row.event, payload: row.payload, ts: new Date().toISOString(), retry: true }),
            });
            status = res.status;
            body = (await res.text()).slice(0, 500);
          } catch (e) {
            body = e instanceof Error ? e.message : String(e);
          }

          const attempts = (row.attempts ?? 1) + 1;
          const ok = status >= 200 && status < 400;
          const isFailure = !ok;
          const giveUp = isFailure && attempts >= 3;
          const backoffMs = Math.pow(2, attempts) * 60_000;

          await supabaseAdmin.from("webhook_deliveries").update({
            attempts,
            status,
            response: body,
            failed: giveUp,
            next_retry_at: isFailure && !giveUp ? new Date(Date.now() + backoffMs).toISOString() : null,
          }).eq("id", row.id);

          if (giveUp) failed++;
          else retried++;
        }

        return Response.json({ ok: true, scanned: rows?.length ?? 0, retried, failed });
      },
    },
  },
});