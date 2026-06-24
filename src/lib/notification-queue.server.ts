/**
 * Notification job queue (cycle #16, step 2).
 *
 * Decouples user-facing actions (createBooking, etc.) from slow third-party
 * sends (Resend, Twilio) by enqueuing a row and draining a batch on a cron
 * tick. Failures are retried with exponential backoff up to 5 attempts.
 *
 * Job kinds:
 *   - "booking_confirmation_email": { to, customerName, whenIso, manageUrl? }
 *   - "booking_whatsapp_confirm":   { to, customerName, whenIso, manageUrl? }
 *   - "booking_whatsapp_reminder":  { to, customerName, whenIso, manageUrl? }
 *   - "campaign_message":           { recipientId }
 */
export type NotificationKind =
  | "booking_confirmation_email"
  | "booking_whatsapp_confirm"
  | "booking_whatsapp_reminder"
  | "campaign_message";

export async function enqueueNotification(
  kind: NotificationKind,
  payload: Record<string, unknown>,
  runAt?: Date,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("notification_jobs").insert({
    kind,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: payload as any,
    run_at: (runAt ?? new Date()).toISOString(),
  });
}