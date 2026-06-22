import { createFileRoute } from "@tanstack/react-router";
import { logger } from "@/lib/logger";

// P4 (cycle #7) — Daily morning digest.
// For each branch, sends a best-effort WhatsApp summary to admin/reception:
//   • today's bookings count
//   • yesterday's paid revenue
//   • yesterday's no-shows
//   • current low-stock product count
// No DB schema changes; idempotency is the operator's responsibility via cron cadence
// (run once/day, typically early morning).

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  return (request.headers.get("x-cron-secret") ?? "") === expected;
}

export const Route = createFileRoute("/api/public/cron/daily-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response("Unauthorized", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
        const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();

        const { data: branches } = await supabaseAdmin
          .from("branches").select("id, name").eq("active", true);

        let notified = 0;
        const { sendWhatsappInternal } = await import("@/lib/twilio.functions");

        for (const br of (branches ?? []) as Array<{ id: string; name: string | null }>) {
          const [{ count: todayCount }, { data: yPaid }, { count: noShows }, { count: lowStock }] = await Promise.all([
            supabaseAdmin.from("bookings").select("id", { count: "exact", head: true })
              .eq("branch_id", br.id).gte("start_at", startOfToday).lt("start_at", startOfTomorrow)
              .in("status", ["pending", "confirmed"]),
            supabaseAdmin.from("invoices").select("total_cents")
              .eq("branch_id", br.id).eq("status", "paid")
              .gte("created_at", startOfYesterday).lt("created_at", startOfToday),
            supabaseAdmin.from("bookings").select("id", { count: "exact", head: true })
              .eq("branch_id", br.id).eq("status", "no_show")
              .gte("start_at", startOfYesterday).lt("start_at", startOfToday),
            supabaseAdmin.from("products").select("id", { count: "exact", head: true })
              .eq("branch_id", br.id).eq("active", true)
              .filter("stock", "lte", "low_stock_threshold"),
          ]);

          const revenue = (yPaid ?? []).reduce((s, r: { total_cents: number | null }) => s + (r.total_cents ?? 0), 0);
          const body = [
            `☀️ Daily digest${br.name ? ` — ${br.name}` : ""}`,
            `• Today's bookings: ${todayCount ?? 0}`,
            `• Yesterday revenue: ${(revenue / 100).toFixed(2)}`,
            `• Yesterday no-shows: ${noShows ?? 0}`,
            `• Low-stock items: ${lowStock ?? 0}`,
          ].join("\n");

          const { data: staff } = await supabaseAdmin
            .from("employees").select("phone")
            .eq("branch_id", br.id).eq("active", true)
            .in("role", ["admin", "reception"]);

          for (const s of (staff ?? []) as Array<{ phone: string | null }>) {
            if (!s.phone) continue;
            try { await sendWhatsappInternal(s.phone, body); notified++; } catch { /* best-effort */ }
          }
        }

        logger.info("daily.digest", { branches: branches?.length ?? 0, notified });
        return Response.json({ ok: true, branches: branches?.length ?? 0, notified });
      },
    },
  },
});