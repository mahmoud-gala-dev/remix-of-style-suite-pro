import { createFileRoute } from "@tanstack/react-router";
import { logger } from "@/lib/logger";

// P4 (cycle #7) — Membership expiry reminders.
// Notifies customers whose `customer_memberships.expires_at` falls within the
// next N days (default 7) and stamps `expiry_reminder_sent_at` so each
// membership is reminded at most once.

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  return (request.headers.get("x-cron-secret") ?? "") === expected;
}

export const Route = createFileRoute("/api/public/cron/membership-expiry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
        const url = new URL(request.url);
        const aheadDays = Math.min(Math.max(Number(url.searchParams.get("aheadDays") ?? 7) || 7, 1), 60);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = new Date();
        const horizon = new Date(now.getTime() + aheadDays * 86400_000);

        const { data: rows, error } = await supabaseAdmin
          .from("customer_memberships")
          .select("id, customer_id, plan_id, expires_at, remaining_visits")
          .eq("status", "active")
          .is("expiry_reminder_sent_at", null)
          .lte("expires_at", horizon.toISOString())
          .gte("expires_at", now.toISOString())
          .limit(500);
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
        if (!rows || rows.length === 0) return Response.json({ ok: true, reminded: 0 });

        const customerIds = [...new Set(rows.map((r) => r.customer_id))];
        const planIds = [...new Set(rows.map((r) => r.plan_id))];
        const [{ data: customers }, { data: plans }] = await Promise.all([
          supabaseAdmin.from("customers").select("id, name, phone, email").in("id", customerIds),
          supabaseAdmin.from("membership_plans").select("id, name_en").in("id", planIds),
        ]);
        const custMap = new Map((customers ?? []).map((c) => [c.id, c]));
        const planMap = new Map((plans ?? []).map((p) => [p.id, p]));

        const { sendWhatsappInternal } = await import("@/lib/twilio.functions");
        const stamped: string[] = [];
        let notified = 0;

        for (const m of rows) {
          const cust = custMap.get(m.customer_id);
          if (!cust?.phone) { stamped.push(m.id); continue; }
          const plan = planMap.get(m.plan_id);
          const days = Math.max(1, Math.ceil((new Date(m.expires_at).getTime() - now.getTime()) / 86400_000));
          const body = `⏰ Reminder: your ${plan?.name_en ?? "membership"} expires in ${days} day${days > 1 ? "s" : ""} (${new Date(m.expires_at).toLocaleDateString()}). Remaining visits: ${m.remaining_visits ?? 0}.`;
          try {
            const r = await sendWhatsappInternal(cust.phone, body);
            if (r.sent) notified++;
          } catch { /* best-effort */ }
          stamped.push(m.id);
        }

        const { error: updErr } = await supabaseAdmin
          .from("customer_memberships")
          .update({ expiry_reminder_sent_at: new Date().toISOString() })
          .in("id", stamped);
        if (updErr) return Response.json({ ok: false, error: updErr.message }, { status: 500 });

        logger.info("memberships.expiry_reminder", { scanned: rows.length, notified, aheadDays });
        return Response.json({ ok: true, scanned: rows.length, notified, aheadDays });
      },
    },
  },
});