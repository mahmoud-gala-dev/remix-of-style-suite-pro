import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/require-admin";

const SETTINGS_KEY = "twilio_whatsapp";

export type TwilioSettings = {
  enabled: boolean;
  account_sid: string;
  auth_token: string;
  from_whatsapp: string; // e.g. "whatsapp:+14155238886"
  notify_booking_created: boolean;
  notify_reminders: boolean;
};

const DEFAULTS: TwilioSettings = {
  enabled: false,
  account_sid: "",
  auth_token: "",
  from_whatsapp: "",
  notify_booking_created: false,
  notify_reminders: false,
};

function redact(cfg: TwilioSettings): TwilioSettings {
  return {
    ...cfg,
    auth_token: cfg.auth_token ? "••••••••" : "",
  };
}

export const getTwilioSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TwilioSettings> => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("app_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle();
    const cfg = { ...DEFAULTS, ...((data?.value as Partial<TwilioSettings>) ?? {}) };
    return redact(cfg);
  });

export const updateTwilioSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    enabled: z.boolean(),
    account_sid: z.string().trim().max(64),
    auth_token: z.string().trim().max(256), // pass "" to keep existing
    from_whatsapp: z.string().trim().max(40),
    notify_booking_created: z.boolean(),
    notify_reminders: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("app_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle();
    const prev = { ...DEFAULTS, ...((existing?.value as Partial<TwilioSettings>) ?? {}) };
    const next: TwilioSettings = {
      enabled: data.enabled,
      account_sid: data.account_sid || prev.account_sid,
      auth_token: data.auth_token ? data.auth_token : prev.auth_token,
      from_whatsapp: data.from_whatsapp || prev.from_whatsapp,
      notify_booking_created: data.notify_booking_created,
      notify_reminders: data.notify_reminders,
    };
    if (next.enabled && (!next.account_sid || !next.auth_token || !next.from_whatsapp)) {
      throw new Error("Account SID, Auth Token, and From number are required to enable Twilio.");
    }
    const { error } = await supabaseAdmin.from("app_settings").upsert({
      key: SETTINGS_KEY, value: next, updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function loadConfig(): Promise<TwilioSettings> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle();
  return { ...DEFAULTS, ...((data?.value as Partial<TwilioSettings>) ?? {}) };
}

async function twilioSend(cfg: TwilioSettings, to: string, body: string) {
  const num = to.replace(/[^\d+]/g, "");
  const toAddr = num.startsWith("whatsapp:") ? num : `whatsapp:${num.startsWith("+") ? num : "+" + num}`;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${cfg.account_sid}/Messages.json`;
  const auth = Buffer.from(`${cfg.account_sid}:${cfg.auth_token}`).toString("base64");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: toAddr, From: cfg.from_whatsapp, Body: body }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${json.message ?? "send failed"}`);
  return { sid: json.sid as string };
}

export const sendWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    to: z.string().trim().min(6).max(40),
    body: z.string().trim().min(1).max(1600),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const cfg = await loadConfig();
    if (!cfg.enabled) return { skipped: true as const, reason: "disabled" };
    return await twilioSend(cfg, data.to, data.body);
  });

export const testTwilio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ to: z.string().trim().min(6).max(40) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const cfg = await loadConfig();
    if (!cfg.enabled) throw new Error("Twilio is disabled. Enable it first in Settings.");
    const r = await twilioSend(cfg, data.to, "Vanguard test message ✅");
    return { ok: true, sid: r.sid };
  });

/**
 * Internal helper for other server functions (e.g. OTP send).
 * Returns `{ sent: false, reason }` instead of throwing when Twilio is
 * disabled or not configured, so callers can fall back gracefully.
 */
export async function sendWhatsappInternal(
  to: string,
  body: string,
): Promise<{ sent: true; sid: string } | { sent: false; reason: string }> {
  try {
    const cfg = await loadConfig();
    if (!cfg.enabled) return { sent: false, reason: "disabled" };
    if (!cfg.account_sid || !cfg.auth_token || !cfg.from_whatsapp) {
      return { sent: false, reason: "not_configured" };
    }
    const r = await twilioSend(cfg, to, body);
    return { sent: true, sid: r.sid };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "send_failed" };
  }
}