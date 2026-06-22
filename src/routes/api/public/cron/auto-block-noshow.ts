import { createFileRoute } from "@tanstack/react-router";
import { logger } from "@/lib/logger";

// P4 (cycle #7) — Auto-block frequent no-show customers.
// Flips `customers.blocked=true` when `no_show_count >= threshold` and
// best-effort notifies admin/reception staff per branch. Idempotent: only
// targets currently-unblocked customers.

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  return (request.headers.get("x-cron-secret") ?? "") === expected;
}

export const Route = createFileRoute("/api/public/cron/auto-block-noshow")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
        const url = new URL(request.url);
        const threshold = Math.min(Math.max(Number(url.searchParams.get("threshold") ?? 3) || 3, 1), 50);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: targets, error } = await supabaseAdmin
          .from("customers")
          .select("id, name, phone, branch_id, no_show_count")
          .eq("blocked", false)
          .gte("no_show_count", threshold)
          .limit(500);
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
        if (!targets || targets.length === 0) return Response.json({ ok: true, blocked: 0, notified: 0 });

        const ids = targets.map((c) => c.id);
        const { error: updErr } = await supabaseAdmin
          .from("customers").update({ blocked: true }).in("id", ids);
        if (updErr) return Response.json({ ok: false, error: updErr.message }, { status: 500 });

        // Group by branch and notify admin/reception.
        const byBranch = new Map<string, typeof targets>();
        for (const c of targets) {
          if (!c.branch_id) continue;
          const list = byBranch.get(c.branch_id) ?? [];
          list.push(c);
          byBranch.set(c.branch_id, list);
        }

        let notified = 0;
        const { sendWhatsappInternal } = await import("@/lib/twilio.functions");
        for (const [branchId, items] of byBranch) {
          const { data: staff } = await supabaseAdmin
            .from("employees").select("phone")
            .eq("branch_id", branchId).eq("active", true)
            .in("role", ["admin", "reception"]);
          const lines = items
            .map((c) => `• ${c.name ?? "—"}${c.phone ? ` (${c.phone})` : ""} — ${c.no_show_count} no-shows`)
            .join("\n");
          const body = `🚫 Auto-blocked ${items.length} customer${items.length > 1 ? "s" : ""} (≥${threshold} no-shows):\n${lines}`;
          for (const s of (staff ?? []) as Array<{ phone: string | null }>) {
            if (!s.phone) continue;
            try { await sendWhatsappInternal(s.phone, body); notified++; } catch { /* best-effort */ }
          }
        }

        logger.info("customers.auto_block_noshow", { blocked: ids.length, notified, threshold });
        return Response.json({ ok: true, blocked: ids.length, notified, threshold });
      },
    },
  },
});