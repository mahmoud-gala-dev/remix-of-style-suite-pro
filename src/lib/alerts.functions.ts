import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type Alert = {
  id: string;
  kind: "membership_expiring" | "webhook_failed" | "notification_queue_stuck";
  title: string;
  detail: string;
  severity: "info" | "warn" | "error";
};

export const getAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const alerts: Alert[] = [];
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // P76 — filter out user-dismissed/snoozed alerts.
    const { data: dismissals } = await context.supabase
      .from("alert_dismissals")
      .select("alert_key, snooze_until");
    const hidden = new Set(
      (dismissals ?? [])
        .filter((d) => !d.snooze_until || new Date(d.snooze_until) > now)
        .map((d) => d.alert_key),
    );

    const { data: mems } = await context.supabase
      .from("customer_memberships")
      .select("id, expires_at, customer_id")
      .lte("expires_at", in7)
      .gte("expires_at", now.toISOString())
      .limit(10);
    for (const m of mems ?? []) {
      const id = `mem-${m.id}`;
      if (hidden.has(id)) continue;
      alerts.push({
        id,
        kind: "membership_expiring",
        title: "Membership expiring",
        detail: `Expires ${new Date(m.expires_at).toLocaleDateString()}`,
        severity: "warn",
      });
    }

    const { data: fails } = await context.supabase
      .from("webhook_deliveries")
      .select("id, event, status, created_at")
      .eq("failed", true)
      .order("created_at", { ascending: false })
      .limit(5);
    for (const f of fails ?? []) {
      const id = `wh-${f.id}`;
      if (hidden.has(id)) continue;
      alerts.push({
        id,
        kind: "webhook_failed",
        title: `Webhook failed: ${f.event}`,
        detail: `Status ${f.status ?? "—"} · ${new Date(f.created_at).toLocaleString()}`,
        severity: "error",
      });
    }

    // Cycle #17 — SLA monitoring for the notification queue.
    // Surfaces when jobs are stuck in 'sending' > 5min or hit the 5-attempt cap.
    const { data: health } = await context.supabase
      .rpc("notification_jobs_health")
      .maybeSingle();
    if (health) {
      const failed = Number(health.failed ?? 0);
      const stuck = Number(health.stuck ?? 0);
      const pending = Number(health.pending ?? 0);
      if (failed > 0 || stuck > 0) {
        const id = "notif-queue-sla";
        if (!hidden.has(id)) {
          alerts.push({
            id,
            kind: "notification_queue_stuck",
            title: "Notification queue degraded",
            detail: `${failed} failed · ${stuck} stuck · ${pending} pending`,
            severity: failed > 0 ? "error" : "warn",
          });
        }
      }
    }

    return alerts;
  });

// P76 — dismiss (optionally snooze) an alert for the current user.
export const dismissAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    alertKey: z.string().min(1).max(120),
    snoozeHours: z.number().int().min(0).max(720).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const snoozeUntil = data.snoozeHours
      ? new Date(Date.now() + data.snoozeHours * 3_600_000).toISOString()
      : null;
    const { error } = await context.supabase
      .from("alert_dismissals")
      .upsert(
        { user_id: context.userId, alert_key: data.alertKey, snooze_until: snoozeUntil, dismissed_at: new Date().toISOString() },
        { onConflict: "user_id,alert_key" },
      );
    if (error) throw error;
    return { ok: true };
  });