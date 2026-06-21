import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const KEYS = ["booking_otp_required", "default_tax_pct", "refresh_interval"] as const;
type Key = (typeof KEYS)[number];

export const getAppSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("key,value")
    .in("key", KEYS as unknown as string[]);
  const out: Record<Key, unknown> = {
    booking_otp_required: false,
    default_tax_pct: 0,
    refresh_interval: 30,
  };
  for (const row of data ?? []) {
    if ((KEYS as readonly string[]).includes(row.key)) {
      (out as Record<string, unknown>)[row.key] = row.value;
    }
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