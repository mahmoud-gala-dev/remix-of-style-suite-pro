import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Subscription = {
  id: string;
  tenant_id: string;
  tier: "free" | "pro" | "enterprise";
  max_bookings_per_month: number;
  status: string;
  current_period_start: string;
  current_period_end: string;
};

export type UsageReport = {
  subscription: Subscription | null;
  used: number;
  limit: number;
  remaining: number;
  over_limit: boolean;
};

export const getTenantUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tenant_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<UsageReport> => {
    const { data: sub } = await context.supabase
      .from("subscriptions").select("*").eq("tenant_id", data.tenant_id).maybeSingle();
    const { data: count } = await context.supabase
      .rpc("count_tenant_bookings_this_period", { _tenant_id: data.tenant_id });
    const limit = sub?.max_bookings_per_month ?? 100;
    const used = (count as unknown as number) ?? 0;
    return {
      subscription: (sub as Subscription) ?? null,
      used,
      limit,
      remaining: Math.max(0, limit - used),
      over_limit: used >= limit,
    };
  });

export const updateTenantTier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    tenant_id: z.string().uuid(),
    tier: z.enum(["free", "pro", "enterprise"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: sa } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" });
    if (!sa) throw new Response("Forbidden", { status: 403 });
    const limits = { free: 100, pro: 1000, enterprise: 100000 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("subscriptions").upsert({
      tenant_id: data.tenant_id,
      tier: data.tier,
      max_bookings_per_month: limits[data.tier],
      updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });