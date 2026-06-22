import { createFileRoute } from "@tanstack/react-router";
import { logger } from "@/lib/logger";

// P1 (cycle #6) — Post-visit review-request cron.
// Finds completed bookings whose end_at is between (now - maxAgeHours) and
// (now - minAgeHours) and have not yet received a review request, then sends a
// best-effort WhatsApp + email asking for a review. Stamps review_request_sent_at
// so each booking is requested exactly once.
//
// Defaults: ask 2h–48h after the visit ended.

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  return (request.headers.get("x-cron-secret") ?? "") === expected;
}

export const Route = createFileRoute("/api/public/cron/review-requests")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response("Unauthorized", { status: 401 });

        const url = new URL(request.url);
        const minAgeHours = Math.min(
          Math.max(Number(url.searchParams.get("minAgeHours") ?? 2) || 2, 1),
          168,
        );
        const maxAgeHours = Math.min(
          Math.max(Number(url.searchParams.get("maxAgeHours") ?? 48) || 48, minAgeHours + 1),
          720,
        );

        const now = Date.now();
        const newest = new Date(now - minAgeHours * 3600_000).toISOString();
        const oldest = new Date(now - maxAgeHours * 3600_000).toISOString();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // review_request_sent_at is added in the same cycle — cast until types regen.
        const q = supabaseAdmin
          .from("bookings")
          .select("id, end_at, customer_id, manage_token")
          .eq("status", "completed")
          .gte("end_at", oldest)
          .lte("end_at", newest)
          .is("review_request_sent_at" as never, null)
          .limit(500);
        const { data: rows, error } = await q;
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        let sent = 0;
        let skipped = 0;

        for (const b of (rows ?? []) as Array<{
          id: string;
          end_at: string;
          customer_id: string;
          manage_token: string | null;
        }>) {
          try {
            const { data: cust } = await supabaseAdmin
              .from("customers")
              .select("name, phone, email")
              .eq("id", b.customer_id)
              .maybeSingle();
            const link = b.manage_token ? `/my/${b.manage_token}` : "";
            const body = `Thanks for your visit! Would you mind leaving a quick review? ${link}`.trim();

            if (cust?.phone) {
              const { sendWhatsappInternal } = await import("@/lib/twilio.functions");
              await sendWhatsappInternal(cust.phone, body);
            }
            if (cust?.email) {
              const { sendBookingConfirmationEmail } = await import("@/lib/notifications.server");
              // Reuse the email helper as a lightweight transactional sender.
              await sendBookingConfirmationEmail({
                to: cust.email,
                customerName: cust.name ?? "there",
                whenIso: b.end_at,
                manageUrl: link || undefined,
              });
            }

            await supabaseAdmin
              .from("bookings")
              .update({ review_request_sent_at: new Date().toISOString() } as never)
              .eq("id", b.id);
            sent++;
          } catch {
            skipped++;
          }
        }

        logger.info("bookings.review_requests", {
          scanned: rows?.length ?? 0,
          sent,
          skipped,
          minAgeHours,
          maxAgeHours,
        });

        return Response.json({ ok: true, scanned: rows?.length ?? 0, sent, skipped });
      },
    },
  },
});