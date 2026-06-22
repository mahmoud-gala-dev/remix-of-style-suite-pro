import { createFileRoute } from "@tanstack/react-router";
import { logger } from "@/lib/logger";

// P2 (cycle #6) — Birthday auto-coupon.
// Finds customers whose birthday month/day == today, mints a one-off
// percent-off coupon per customer per year (idempotent via deterministic
// code `BDAY-<id8>-<yyyy>`), and best-effort notifies via WhatsApp/email.

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  return (request.headers.get("x-cron-secret") ?? "") === expected;
}

export const Route = createFileRoute("/api/public/cron/birthday-coupons")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
        const url = new URL(request.url);
        const percent = Math.min(Math.max(Number(url.searchParams.get("percent") ?? 20) || 20, 1), 90);
        const validDays = Math.min(Math.max(Number(url.searchParams.get("validDays") ?? 14) || 14, 1), 365);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const today = new Date();
        const mmdd = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const year = today.getFullYear();

        // Pull birthdays once; filter in JS (birthday may include year so we compare month/day only).
        const { data: customers, error } = await supabaseAdmin
          .from("customers")
          .select("id, name, phone, email, birthday, branch_id")
          .not("birthday", "is", null)
          .limit(2000);
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        const validUntil = new Date(Date.now() + validDays * 86400_000).toISOString();
        let minted = 0, skipped = 0, notified = 0;

        for (const c of (customers ?? []) as Array<{
          id: string; name: string | null; phone: string | null;
          email: string | null; birthday: string | null; branch_id: string | null;
        }>) {
          if (!c.birthday) continue;
          // Accept YYYY-MM-DD or MM-DD or DD/MM/YYYY — extract month/day.
          const m = c.birthday.match(/(\d{2})[-/](\d{2})/g);
          if (!m) continue;
          // Try YYYY-MM-DD first
          let mm = "", dd = "";
          const iso = c.birthday.match(/^\d{4}-(\d{2})-(\d{2})/);
          if (iso) { mm = iso[1]; dd = iso[2]; }
          else {
            const alt = c.birthday.match(/^(\d{2})[-/](\d{2})/);
            if (alt) { mm = alt[1]; dd = alt[2]; }
          }
          if (`${mm}-${dd}` !== mmdd) continue;

          const code = `BDAY-${c.id.slice(0, 8).toUpperCase()}-${year}`;
          const { data: existing } = await supabaseAdmin
            .from("coupons").select("id").eq("code", code).maybeSingle();
          if (existing) { skipped++; continue; }

          const { error: insErr } = await supabaseAdmin.from("coupons").insert({
            code, kind: "percent", value: percent, max_uses: 1,
            valid_until: validUntil, active: true, branch_id: c.branch_id,
          });
          if (insErr) { skipped++; continue; }
          minted++;

          const body = `🎉 Happy Birthday${c.name ? `, ${c.name}` : ""}! Enjoy ${percent}% off with code ${code} (valid ${validDays} days).`;
          try {
            if (c.phone) {
              const { sendWhatsappInternal } = await import("@/lib/twilio.functions");
              await sendWhatsappInternal(c.phone, body);
            }
            if (c.email) {
              const { sendBookingConfirmationEmail } = await import("@/lib/notifications.server");
              await sendBookingConfirmationEmail({
                to: c.email, customerName: c.name ?? "there",
                whenIso: new Date().toISOString(),
                manageUrl: undefined,
              });
            }
            notified++;
          } catch { /* best-effort */ }
        }

        logger.info("birthday.coupons", { minted, skipped, notified });
        return Response.json({ ok: true, minted, skipped, notified });
      },
    },
  },
});