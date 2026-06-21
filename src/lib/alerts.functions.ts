import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Alert = {
  id: string;
  kind: "membership_expiring" | "webhook_failed";
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

    const { data: mems } = await context.supabase
      .from("customer_memberships")
      .select("id, expires_at, customer_id")
      .lte("expires_at", in7)
      .gte("expires_at", now.toISOString())
      .limit(10);
    for (const m of mems ?? []) {
      alerts.push({
        id: `mem-${m.id}`,
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
      alerts.push({
        id: `wh-${f.id}`,
        kind: "webhook_failed",
        title: `Webhook failed: ${f.event}`,
        detail: `Status ${f.status ?? "—"} · ${new Date(f.created_at).toLocaleString()}`,
        severity: "error",
      });
    }

    return alerts;
  });