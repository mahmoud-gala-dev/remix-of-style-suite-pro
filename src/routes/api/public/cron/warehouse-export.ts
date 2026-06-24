import { createFileRoute } from "@tanstack/react-router";
import { logger } from "@/lib/logger";

// P4 (cycle #36) — Nightly Data Warehouse export.
// Aggregates yesterday's tenant-level facts into structured logs that external
// ETL pipelines (Metabase / Superset / BigQuery loader) can scrape.
// Tables sampled: bookings, invoices, customers (counts + sums only — no PII).
// Idempotency: cron cadence (run once per night). Cron-secret protected like
// every other endpoint under /api/public/cron/*.

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  return (request.headers.get("x-cron-secret") ?? "") === expected;
}

export const Route = createFileRoute("/api/public/cron/warehouse-export")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response("Unauthorized", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

        const { data: branches } = await supabaseAdmin
          .from("branches")
          .select("id, tenant_id, name_en")
          .eq("active", true);

        const records: Array<Record<string, unknown>> = [];
        for (const br of (branches ?? []) as Array<{ id: string; tenant_id: string | null; name_en: string | null }>) {
          const [bk, inv, cust] = await Promise.all([
            supabaseAdmin
              .from("bookings")
              .select("status, price")
              .eq("branch_id", br.id)
              .gte("created_at", start)
              .lt("created_at", end),
            supabaseAdmin
              .from("invoices")
              .select("status, total")
              .eq("branch_id", br.id)
              .gte("created_at", start)
              .lt("created_at", end),
            supabaseAdmin
              .from("customers")
              .select("id", { count: "exact", head: true })
              .eq("branch_id", br.id)
              .gte("created_at", start)
              .lt("created_at", end),
          ]);

          const bookings = (bk.data ?? []) as Array<{ status: string; price: number | null }>;
          const invoices = (inv.data ?? []) as Array<{ status: string; total: number | null }>;
          records.push({
            date: start.slice(0, 10),
            tenant_id: br.tenant_id,
            branch_id: br.id,
            branch_name: br.name_en,
            bookings_total: bookings.length,
            bookings_completed: bookings.filter((b) => b.status === "completed").length,
            bookings_noshow: bookings.filter((b) => b.status === "no_show").length,
            bookings_revenue: bookings
              .filter((b) => b.status === "completed")
              .reduce((s, b) => s + (b.price ?? 0), 0),
            invoices_total: invoices.length,
            invoices_paid_amount: invoices
              .filter((i) => i.status === "paid")
              .reduce((s, i) => s + (i.total ?? 0), 0),
            new_customers: cust.count ?? 0,
          });
        }

        for (const row of records) {
          logger.info("warehouse.fact", row);
        }

        return Response.json({ ok: true, exported: records.length, period: { start, end } });
      },
    },
  },
});