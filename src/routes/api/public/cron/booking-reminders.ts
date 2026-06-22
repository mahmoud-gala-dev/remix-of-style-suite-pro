import { createFileRoute } from "@tanstack/react-router";
import { logger } from "@/lib/logger";

// P1 (cycle #6) — Booking reminder cron.
// Finds confirmed/pending bookings whose start_at is within the reminder window
// (default 24h ahead, 1h slack) and have never been reminded
// (reminder_sent_at IS NULL). Sends best-effort WhatsApp + email and stamps the
// reminder timestamp so each booking is reminded at most once.

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true; // dev: open
  return (request.headers.get("x-cron-secret") ?? "") === expected;
}

export const Route = createFileRoute("/api/public/cron/booking-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response("Unauthorized", { status: 401 });

        const url = new URL(request.url);
        const aheadHours = Math.min(
          Math.max(Number(url.searchParams.get("aheadHours") ?? 24) || 24, 1),
          168,
        );
        const slackHours = Math.min(
          Math.max(Number(url.searchParams.get("slackHours") ?? 1) || 1, 1),
          24,
        );

        const now = Date.now();
        const from = new Date(now + (aheadHours - slackHours) * 3600_000).toISOString();
        const to = new Date(now + aheadHours * 3600_000).toISOString();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: rows, error } = await supabaseAdmin
          .from("bookings")
          .select("id, start_at, status, customer_id, manage_token")
          .is("reminder_sent_at", null)
          .in("status", ["pending", "confirmed"])
          .gte("start_at", from)
          .lte("start_at", to)
          .limit(500);
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        let sent = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (const b of rows ?? []) {
          try {
            const { data: cust } = await supabaseAdmin
              .from("customers")
              .select("name, phone, email")
              .eq("id", b.customer_id)
              .maybeSingle();
            const when = new Date(b.start_at).toLocaleString();
            const manage = b.manage_token ? `/my/${b.manage_token}` : "";

            if (cust?.phone) {
              const { sendWhatsappInternal } = await import("@/lib/twilio.functions");
              await sendWhatsappInternal(
                cust.phone,
                `Reminder: your booking is on ${when}. ${manage}`.trim(),
              );
            }
            if (cust?.email) {
              const { sendBookingConfirmationEmail } = await import("@/lib/notifications.server");
              await sendBookingConfirmationEmail({
                to: cust.email,
                customerName: cust.name ?? "there",
                whenIso: b.start_at,
                manageUrl: manage || undefined,
              });
            }

            await supabaseAdmin
              .from("bookings")
              .update({ reminder_sent_at: new Date().toISOString() })
              .eq("id", b.id);
            sent++;
          } catch (e) {
            skipped++;
            errors.push(e instanceof Error ? e.message : "unknown");
          }
        }

        logger.info("bookings.reminders", {
          scanned: rows?.length ?? 0,
          sent,
          skipped,
          aheadHours,
          slackHours,
        });

        return Response.json({
          ok: true,
          scanned: rows?.length ?? 0,
          sent,
          skipped,
          errors: errors.slice(0, 10),
        });
      },
    },
  },
});