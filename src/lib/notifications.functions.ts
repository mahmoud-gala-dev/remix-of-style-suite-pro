import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/require-admin";

const SETTINGS_KEY = "notification_settings";

export type NotificationProvider = "off" | "lovable" | "resend";

export type NotificationSettings = {
  provider: NotificationProvider;
  from_email: string;
  notify_booking_created: boolean;
};

const DEFAULTS: NotificationSettings = {
  provider: "off",
  from_email: "",
  notify_booking_created: false,
};

export const getNotificationSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<NotificationSettings> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("app_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle();
    if (!data?.value) return DEFAULTS;
    return { ...DEFAULTS, ...(data.value as Partial<NotificationSettings>) };
  });

export const updateNotificationSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    provider: z.enum(["off", "lovable", "resend"]),
    from_email: z.string().email().or(z.literal("")),
    notify_booking_created: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("app_settings").upsert({
      key: SETTINGS_KEY,
      value: data,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function sendViaResend(args: { from: string; to: string; subject: string; html: string }) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!lovableKey || !resendKey) {
    throw new Error("Resend not configured. Connect Resend in Workspace Settings.");
  }
  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
    body: JSON.stringify({ from: args.from, to: [args.to], subject: args.subject, html: args.html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return res.json();
}

async function sendViaLovable(_args: { to: string; subject: string; html: string }) {
  // Lovable Emails uses scaffolded templates. Until templates are scaffolded,
  // surface a clear error so the admin knows to enable them.
  throw new Error(
    "Lovable Emails not scaffolded yet. Ask Lovable to set up email infrastructure and templates.",
  );
}

export const sendNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    to: z.string().email(),
    subject: z.string().min(1),
    html: z.string().min(1),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("app_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle();
    const cfg = { ...DEFAULTS, ...((row?.value as Partial<NotificationSettings>) ?? {}) };
    if (cfg.provider === "off") return { skipped: true, reason: "provider_off" as const };
    if (cfg.provider === "resend") {
      const from = cfg.from_email || "Vanguard <onboarding@resend.dev>";
      const result = await sendViaResend({ from, to: data.to, subject: data.subject, html: data.html });
      return { sent: true, provider: "resend" as const, result };
    }
    await sendViaLovable({ to: data.to, subject: data.subject, html: data.html });
    return { sent: true, provider: "lovable" as const };
  });