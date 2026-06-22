import { createFileRoute } from "@tanstack/react-router";

// Cycle #16, step 2 — drain pending notification_jobs in batches.
// Called by pg_cron every minute. Idempotent: claims rows by flipping status
// to 'sending' before doing network I/O so concurrent ticks don't double-send.
const MAX_ATTEMPTS = 5;
const BATCH = 25;

export const Route = createFileRoute("/api/public/cron/drain-notifications")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const nowIso = new Date().toISOString();

        // Claim a batch atomically by updating status -> 'sending'.
        const { data: claimed } = await supabaseAdmin
          .from("notification_jobs")
          .update({ status: "sending" })
          .in("status", ["pending", "failed"])
          .lte("run_at", nowIso)
          .lt("attempts", MAX_ATTEMPTS)
          .select("id, kind, payload, attempts")
          .limit(BATCH);

        let sent = 0;
        let failed = 0;
        for (const job of claimed ?? []) {
          const attempts = (job.attempts ?? 0) + 1;
          try {
            await runJob(job.kind, job.payload as Record<string, unknown>);
            await supabaseAdmin
              .from("notification_jobs")
              .update({ status: "done", attempts, last_error: null })
              .eq("id", job.id);
            sent++;
          } catch (e) {
            failed++;
            const giveUp = attempts >= MAX_ATTEMPTS;
            const backoffMs = Math.min(2 ** attempts, 60) * 60_000; // up to 1 h
            await supabaseAdmin
              .from("notification_jobs")
              .update({
                status: giveUp ? "failed" : "pending",
                attempts,
                last_error: e instanceof Error ? e.message.slice(0, 500) : String(e),
                run_at: giveUp ? nowIso : new Date(Date.now() + backoffMs).toISOString(),
              })
              .eq("id", job.id);
          }
        }

        return Response.json({ ok: true, scanned: claimed?.length ?? 0, sent, failed });
      },
    },
  },
});

async function runJob(kind: string, payload: Record<string, unknown>): Promise<void> {
  switch (kind) {
    case "booking_confirmation_email": {
      const { sendBookingConfirmationEmail } = await import("@/lib/notifications.server");
      await sendBookingConfirmationEmail({
        to: String(payload.to ?? ""),
        customerName: String(payload.customerName ?? ""),
        whenIso: String(payload.whenIso ?? ""),
        manageUrl: payload.manageUrl ? String(payload.manageUrl) : undefined,
      });
      return;
    }
    default:
      throw new Error(`Unknown notification kind: ${kind}`);
  }
}