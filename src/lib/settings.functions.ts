import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const KEYS = [
  "booking_otp_required",
  "default_tax_pct",
  "refresh_interval",
  "deposits_enabled",
  "deposit_type",
  "deposit_amount",
  "whatsapp_reminders_enabled",
  "whatsapp_api_enabled",
  "push_notifications_enabled",
] as const;

export type AppSettings = {
  booking_otp_required: boolean;
  default_tax_pct: number;
  refresh_interval: number;
  deposits_enabled: boolean;
  deposit_type: "fixed" | "percent";
  deposit_amount: number;
  whatsapp_reminders_enabled: boolean;
  whatsapp_api_enabled: boolean;
  push_notifications_enabled: boolean;
};

export const getAppSettings = createServerFn({ method: "GET" }).handler(async (): Promise<AppSettings> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("key,value")
    .in("key", KEYS as unknown as string[]);
  const out: AppSettings = {
    booking_otp_required: false,
    default_tax_pct: 0,
    refresh_interval: 30,
    deposits_enabled: false,
    deposit_type: "percent",
    deposit_amount: 20,
    whatsapp_reminders_enabled: true,
    whatsapp_api_enabled: false,
    push_notifications_enabled: false,
  };
  for (const row of data ?? []) {
    if (row.key === "booking_otp_required") out.booking_otp_required = Boolean(row.value);
    else if (row.key === "default_tax_pct") out.default_tax_pct = Number(row.value) || 0;
    else if (row.key === "refresh_interval") out.refresh_interval = Number(row.value) || 30;
    else if (row.key === "deposits_enabled") out.deposits_enabled = Boolean(row.value);
    else if (row.key === "deposit_type") out.deposit_type = row.value === "fixed" ? "fixed" : "percent";
    else if (row.key === "deposit_amount") out.deposit_amount = Number(row.value) || 0;
    else if (row.key === "whatsapp_reminders_enabled") out.whatsapp_reminders_enabled = Boolean(row.value);
    else if (row.key === "whatsapp_api_enabled") out.whatsapp_api_enabled = Boolean(row.value);
    else if (row.key === "push_notifications_enabled") out.push_notifications_enabled = Boolean(row.value);
  }
  return out;
});

export const setAppSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        key: z.enum(KEYS),
        value: z.union([z.boolean(), z.number(), z.string()]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const [admin, sa] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" }),
    ]);
    if (!admin.data && !sa.data) throw new Response("Forbidden", { status: 403 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert({ key: data.key, value: data.value, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });