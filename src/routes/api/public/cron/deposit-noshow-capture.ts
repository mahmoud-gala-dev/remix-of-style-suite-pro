import { createFileRoute } from "@tanstack/react-router";
import { logger } from "@/lib/logger";

// P1 (cycle #6) — Auto-capture no-show deposit holds.
// Scans bookings where status='noShow', deposit_status='authorized', and
// start_at older than `graceHours` (default 1h). Captures via Stripe and
// stamps deposit_settled_at. Releases authorized holds on bookings that
// have been completed (in case the front desk forgets to release).

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  return (request.headers.get("x-cron-secret") ?? "") === expected;
}

async function stripeFetch(path: string, key: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Stripe ${res.status}: ${t}`);
  }
}

export const Route = createFileRoute("/api/public/cron/deposit-noshow-capture")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
        const url = new URL(request.url);
        const graceHours = Math.min(
          Math.max(Number(url.searchParams.get("graceHours") ?? 1) || 1, 0),
          72,
        );
        const cutoff = new Date(Date.now() - graceHours * 3600_000).toISOString();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: cfgRow } = await supabaseAdmin
          .from("app_settings").select("value").eq("key", "stripe_billing").maybeSingle();
        const cfg = (cfgRow?.value ?? {}) as { enabled?: boolean; secret_key?: string };
        if (!cfg.enabled || !cfg.secret_key) {
          return Response.json({ ok: false, error: "stripe_disabled" }, { status: 200 });
        }

        const baseSel = "id, deposit_intent_id" as const;
        const { data: toCapture } = await supabaseAdmin
          .from("bookings").select(baseSel)
          .eq("status", "no_show")
          .eq("deposit_status" as never, "authorized")
          .lte("start_at", cutoff).limit(200);
        const { data: toRelease } = await supabaseAdmin
          .from("bookings").select(baseSel)
          .eq("status", "completed")
          .eq("deposit_status" as never, "authorized").limit(200);

        let captured = 0, released = 0, errors = 0;
        for (const b of (toCapture ?? []) as Array<{ id: string; deposit_intent_id: string | null }>) {
          if (!b.deposit_intent_id) continue;
          try {
            await stripeFetch(`/payment_intents/${b.deposit_intent_id}/capture`, cfg.secret_key!);
            await supabaseAdmin.from("bookings").update({
              deposit_status: "captured",
              deposit_settled_at: new Date().toISOString(),
            } as never).eq("id", b.id);
            captured++;
          } catch { errors++; }
        }
        for (const b of (toRelease ?? []) as Array<{ id: string; deposit_intent_id: string | null }>) {
          if (!b.deposit_intent_id) continue;
          try {
            await stripeFetch(`/payment_intents/${b.deposit_intent_id}/cancel`, cfg.secret_key!);
            await supabaseAdmin.from("bookings").update({
              deposit_status: "released",
              deposit_settled_at: new Date().toISOString(),
            } as never).eq("id", b.id);
            released++;
          } catch { errors++; }
        }

        logger.info("deposits.noshow_sweep", { captured, released, errors, graceHours });
        return Response.json({ ok: true, captured, released, errors });
      },
    },
  },
});