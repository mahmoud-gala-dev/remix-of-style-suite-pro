import { createFileRoute } from "@tanstack/react-router";
import { logger } from "@/lib/logger";

// P4 (cycle #7) — Re-engagement cron.
// Finds customers with prior visits but no `last_visit` in the last N days,
// mints a one-off percent-off coupon `REENG-<id8>-<yyyymm>` (idempotent per
// customer per month), and sends best-effort WhatsApp + email.

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  return (request.headers.get("x-cron-secret") ?? "") === expected;
}

export const Route = createFileRoute("/api/public/cron/reengagement")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
        const url = new URL(request.url);
        const inactiveDays = Math.min(Math.max(Number(url.searchParams.get("inactiveDays") ?? 60) || 60, 14), 365);
        const percent = Math.min(Math.max(Number(url.searchParams.get("percent") ?? 15) || 15, 1), 90);
        const validDays = Math.min(Math.max(Number(url.searchParams.get("validDays") ?? 30) || 30, 1), 365);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const cutoff = new Date(Date.now() - inactiveDays * 86400_000).toISOString();
        const now = new Date();
        const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
        const validUntil = new Date(Date.now() + validDays * 86400_000).toISOString();

        const { data: customers, error } = await supabaseAdmin
          .from("customers")
          .select("id, name, phone, email, branch_id, last_visit, visits, blocked")
          .gt("visits", 0)
          .eq("blocked", false)
          .not("last_visit", "is", null)
          .lt("last_visit", cutoff)
          .limit(1000);
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        let minted = 0, skipped = 0, notified = 0;
        const { sendWhatsappInternal } = await import("@/lib/twilio.functions");

        for (const c of (customers ?? []) as Array<{
          id: string; name: string | null; phone: string | null;
          email: string | null; branch_id: string | null;
        }>) {
          const code = `REENG-${c.id.slice(0, 8).toUpperCase()}-${yyyymm}`;
          const { data: existing } = await supabaseAdmin
            .from("coupons").select("id").eq("code", code).maybeSingle();
          if (existing) { skipped++; continue; }

          const { error: insErr } = await supabaseAdmin.from("coupons").insert({
            code, kind: "percent", value: percent, max_uses: 1,
            valid_until: validUntil, active: true, branch_id: c.branch_id,
          });
          if (insErr) { skipped++; continue; }
          minted++;

          const body = `We miss you${c.name ? `, ${c.name}` : ""}! Come back and enjoy ${percent}% off with code ${code} (valid ${validDays} days).`;
          try {
            if (c.phone) await sendWhatsappInternal(c.phone, body);
            if (c.email) {
              const { sendBookingConfirmationEmail } = await import("@/lib/notifications.server");
              await sendBookingConfirmationEmail({
                to: c.email, customerName: c.name ?? "there",
                whenIso: new Date().toISOString(), manageUrl: undefined,
              });
            }
            notified++;
          } catch { /* best-effort */ }
        }

        logger.info("customers.reengagement", { scanned: customers?.length ?? 0, minted, skipped, notified });
        return Response.json({ ok: true, scanned: customers?.length ?? 0, minted, skipped, notified });
      },
    },
  },
});