import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/require-admin";

export type FeatureFlag = {
  key: string;
  enabled: boolean;
  rollout_percent: number;
  description: string | null;
};

export const listFeatureFlags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FeatureFlag[]> => {
    const { data, error } = await context.supabase
      .from("feature_flags")
      .select("key, enabled, rollout_percent, description")
      .order("key");
    if (error) throw new Error(error.message);
    return (data ?? []) as FeatureFlag[];
  });

export const upsertFeatureFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    key: z.string().trim().min(1).max(80).regex(/^[a-z0-9_.-]+$/i),
    enabled: z.boolean(),
    rollout_percent: z.number().int().min(0).max(100),
    description: z.string().trim().max(500).optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("feature_flags").upsert({
      key: data.key,
      enabled: data.enabled,
      rollout_percent: data.rollout_percent,
      description: data.description ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteFeatureFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ key: z.string().trim().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("feature_flags").delete().eq("key", data.key);
    if (error) throw new Error(error.message);
    return { ok: true };
  });