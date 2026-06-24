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
    case "booking_whatsapp_confirm":
    case "booking_whatsapp_reminder": {
      const { sendWhatsappInternal } = await import("@/lib/twilio.functions");
      const to = String(payload.to ?? "");
      if (!to) return;
      const name = String(payload.customerName ?? "");
      const when = new Date(String(payload.whenIso ?? "")).toLocaleString();
      const manage = payload.manageUrl ? String(payload.manageUrl) : "";
      const body = kind === "booking_whatsapp_reminder"
        ? `Reminder: ${name}, your booking is on ${when}.${manage ? ` Manage: ${manage}` : ""}`
        : `${name}, your booking is confirmed for ${when}.${manage ? ` Manage: ${manage}` : ""}`;
      const r = await sendWhatsappInternal(to, body);
      if (!r.sent && r.reason !== "disabled" && r.reason !== "not_configured") {
        throw new Error(r.reason);
      }
      return;
    }
    case "campaign_message": {
      await runCampaignMessage(String(payload.recipientId ?? ""));
      return;
    }
    default:
      throw new Error(`Unknown notification kind: ${kind}`);
  }
}

async function runCampaignMessage(recipientId: string): Promise<void> {
  if (!recipientId) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rec, error } = await supabaseAdmin
    .from("campaign_recipients")
    .select("id, campaign_id, status, customers(name, phone, email), campaigns(channel, subject, body, status)")
    .eq("id", recipientId)
    .single();
  if (error || !rec) throw new Error(error?.message ?? "Recipient not found");
  if (rec.status !== "pending") return;
  const camp = rec.campaigns as { channel: string; subject: string | null; body: string; status: string } | null;
  const cust = rec.customers as { name: string | null; phone: string | null; email: string | null } | null;
  if (!camp || !cust) throw new Error("Bad recipient row");
  if (camp.status === "cancelled") {
    await supabaseAdmin.from("campaign_recipients")
      .update({ status: "skipped", error: "campaign cancelled" }).eq("id", recipientId);
    return;
  }
  const body = (camp.body ?? "").replace(/\{name\}/gi, cust.name ?? "");
  try {
    if (camp.channel === "whatsapp") {
      if (!cust.phone) throw new Error("no phone");
      const { sendWhatsappInternal } = await import("@/lib/twilio.functions");
      const r = await sendWhatsappInternal(cust.phone, body);
      if (!r.sent) throw new Error(r.reason);
    } else if (camp.channel === "email") {
      if (!cust.email) throw new Error("no email");
      await sendCampaignEmail(cust.email, camp.subject ?? "Update", body);
    } else if (camp.channel === "push") {
      const { broadcastWebPush } = await import("@/lib/push.server");
      await broadcastWebPush({ title: camp.subject ?? "Update", body, url: "/" });
    } else {
      throw new Error(`unknown channel ${camp.channel}`);
    }
    await supabaseAdmin.from("campaign_recipients")
      .update({ status: "sent", sent_at: new Date().toISOString(), error: null })
      .eq("id", recipientId);
    await bumpCampaignCounter(rec.campaign_id, "sent_count");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabaseAdmin.from("campaign_recipients")
      .update({ status: "failed", error: msg.slice(0, 500) }).eq("id", recipientId);
    await bumpCampaignCounter(rec.campaign_id, "failed_count");
    throw e;
  }
}

async function bumpCampaignCounter(campaignId: string, col: "sent_count" | "failed_count") {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: c } = await supabaseAdmin
    .from("campaigns").select("sent_count, failed_count, recipient_count").eq("id", campaignId).single();
  if (!c) return;
  const next = { sent_count: c.sent_count, failed_count: c.failed_count } as Record<string, number>;
  next[col] = (next[col] ?? 0) + 1;
  const total = (next.sent_count ?? 0) + (next.failed_count ?? 0);
  const status = total >= (c.recipient_count ?? 0)
    ? (next.failed_count === c.recipient_count ? "failed" : "sent")
    : undefined;
  await supabaseAdmin.from("campaigns")
    .update({ ...next, ...(status ? { status } : {}) }).eq("id", campaignId);
}

async function sendCampaignEmail(to: string, subject: string, text: string) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!lovableKey || !resendKey) throw new Error("email not configured");
  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
    body: JSON.stringify({
      from: "Campaigns <onboarding@resend.dev>",
      to: [to],
      subject,
      text,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}