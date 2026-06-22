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
          .from("branches").select("id, name_en").eq("active", true);

        let notified = 0;
        const { sendWhatsappInternal } = await import("@/lib/twilio.functions");

        for (const br of (branches ?? []) as Array<{ id: string; name_en: string | null }>) {
          const [{ count: todayCount }, { data: yPaid }, { count: noShows }, { data: prods }] = await Promise.all([
            supabaseAdmin.from("bookings").select("id", { count: "exact", head: true })
              .eq("branch_id", br.id).gte("start_at", startOfToday).lt("start_at", startOfTomorrow)
              .in("status", ["pending", "confirmed"]),
            supabaseAdmin.from("invoices").select("total")
              .eq("branch_id", br.id).eq("status", "paid")
              .gte("created_at", startOfYesterday).lt("created_at", startOfToday),
            supabaseAdmin.from("bookings").select("id", { count: "exact", head: true })
              .eq("branch_id", br.id).eq("status", "no_show")
              .gte("start_at", startOfYesterday).lt("start_at", startOfToday),
            supabaseAdmin.from("products").select("stock, low_stock_threshold")
              .eq("branch_id", br.id).eq("active", true),
          ]);

          const revenue = ((yPaid ?? []) as Array<{ total: number | null }>)
            .reduce((s, r) => s + (Number(r.total) || 0), 0);
          const lowStock = ((prods ?? []) as Array<{ stock: number; low_stock_threshold: number }>)
            .filter((p) => Number(p.stock) <= Number(p.low_stock_threshold)).length;
          const body = [
            `☀️ Daily digest${br.name_en ? ` — ${br.name_en}` : ""}`,
            `• Today's bookings: ${todayCount ?? 0}`,
            `• Yesterday revenue: ${revenue.toFixed(2)}`,
            `• Yesterday no-shows: ${noShows ?? 0}`,
            `• Low-stock items: ${lowStock}`,
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