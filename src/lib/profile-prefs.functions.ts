import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const roleMapSchema = z.object({ admin: z.array(z.string()), user: z.array(z.string()) });
const layoutSchema = z.object({
  mode: z.enum(["sidebar", "topbar"]),
  hiddenItems: roleMapSchema,
  footerEnabled: z.boolean(),
  footerItems: roleMapSchema,
});

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export const getProfileLayoutPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("preferences")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const parsed = layoutSchema.safeParse(asRecord(data?.preferences).layout);
    return { layout: parsed.success ? parsed.data : null };
  });

export const saveProfileLayoutPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => layoutSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: profile, error: readError } = await context.supabase
      .from("profiles")
      .select("preferences")
      .eq("id", context.userId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);

    const preferences = { ...asRecord(profile?.preferences), layout: data };
    const { error } = await context.supabase
      .from("profiles")
      .upsert({ id: context.userId, preferences, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });