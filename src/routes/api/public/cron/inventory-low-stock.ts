import { createFileRoute } from "@tanstack/react-router";
import { logger } from "@/lib/logger";

// P4 (cycle #6) — Inventory low-stock alerts.
// Scans active products where stock <= low_stock_threshold and last_low_stock_alert_at
// is null or older than the cooldown window, then notifies branch admins/reception
// via WhatsApp (best-effort) and stamps last_low_stock_alert_at.

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  return (request.headers.get("x-cron-secret") ?? "") === expected;
}

export const Route = createFileRoute("/api/public/cron/inventory-low-stock")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
        const url = new URL(request.url);
        const cooldownHours = Math.min(Math.max(Number(url.searchParams.get("cooldownHours") ?? 24) || 24, 1), 24 * 30);
        const cutoff = new Date(Date.now() - cooldownHours * 3600_000).toISOString();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: products, error } = await supabaseAdmin
          .from("products")
          .select("id, name, sku, stock, low_stock_threshold, unit, branch_id, last_low_stock_alert_at")
          .eq("active", true)
          .or(`last_low_stock_alert_at.is.null,last_low_stock_alert_at.lt.${cutoff}`)
          .limit(500);
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        const low = (products ?? []).filter(
          (p) => Number(p.stock) <= Number(p.low_stock_threshold),
        );
        if (low.length === 0) return Response.json({ ok: true, alerted: 0, notified: 0 });

        // Group by branch and notify staff (admin/reception/staff with phone) in each branch.
        const byBranch = new Map<string, typeof low>();
        for (const p of low) {
          if (!p.branch_id) continue;
          const list = byBranch.get(p.branch_id) ?? [];
          list.push(p);
          byBranch.set(p.branch_id, list);
        }

        let notified = 0;
        const { sendWhatsappInternal } = await import("@/lib/twilio.functions");

        for (const [branchId, items] of byBranch) {
          const { data: staff } = await supabaseAdmin
            .from("employees")
            .select("phone, role")
            .eq("branch_id", branchId)
            .eq("active", true)
            .in("role", ["admin", "reception"]);

          const lines = items
            .map((p) => `• ${p.name}${p.sku ? ` (${p.sku})` : ""}: ${p.stock} ${p.unit} (≤ ${p.low_stock_threshold})`)
            .join("\n");
          const body = `⚠️ Low stock alert (${items.length} item${items.length > 1 ? "s" : ""}):\n${lines}`;

          for (const s of (staff ?? []) as Array<{ phone: string | null }>) {
            if (!s.phone) continue;
            try { await sendWhatsappInternal(s.phone, body); notified++; } catch { /* best-effort */ }
          }
        }

        const ids = low.map((p) => p.id);
        const { error: stampErr } = await supabaseAdmin
          .from("products")
          .update({ last_low_stock_alert_at: new Date().toISOString() })
          .in("id", ids);
        if (stampErr) logger.warn("inventory.low_stock.stamp_failed", { error: stampErr.message });

        logger.info("inventory.low_stock", { alerted: low.length, notified, branches: byBranch.size });
        return Response.json({ ok: true, alerted: low.length, notified, branches: byBranch.size });
      },
    },
  },
});