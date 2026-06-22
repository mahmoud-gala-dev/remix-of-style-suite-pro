// Server-only helpers callable from other server functions (no auth middleware).
// Used by createBooking to send a best-effort confirmation email.

type Settings = {
  provider: "off" | "lovable" | "resend";
  from_email: string;
  notify_booking_created: boolean;
};

const DEFAULTS: Settings = { provider: "off", from_email: "", notify_booking_created: false };

export async function sendBookingConfirmationEmail(args: {
  to: string;
  customerName: string;
  whenIso: string;
  manageUrl?: string;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await supabaseAdmin
    .from("app_settings").select("value").eq("key", "notification_settings").maybeSingle();
  const cfg: Settings = { ...DEFAULTS, ...((row?.value as Partial<Settings>) ?? {}) };
  if (cfg.provider !== "resend" || !cfg.notify_booking_created) return { skipped: true };

  const lovableKey = process.env.LOVABLE_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!lovableKey || !resendKey) return { skipped: true, reason: "not_configured" };

  const when = new Date(args.whenIso).toLocaleString();
  const manage = args.manageUrl
    ? `<p><a href="${args.manageUrl}">Manage your booking</a></p>` : "";
  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5">
      <h2>Booking confirmed</h2>
      <p>Hi ${escapeHtml(args.customerName)},</p>
      <p>Your booking is confirmed for <strong>${escapeHtml(when)}</strong>.</p>
      ${manage}
    </div>`;
  const from = cfg.from_email || "Bookings <onboarding@resend.dev>";
  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
    body: JSON.stringify({ from, to: [args.to], subject: "Booking confirmed", html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return { sent: true };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}