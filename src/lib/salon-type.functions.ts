import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const SALON_TYPES = ["barbershop", "women_salon", "unisex", "spa"] as const;
export type SalonType = (typeof SALON_TYPES)[number];

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const [a, sa] = await Promise.all([
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" }),
  ]);
  if (!a.data && !sa.data) throw new Response("Forbidden", { status: 403 });
}

export const listMyTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("tenants")
      .select("id,name,salon_type,staff_photos_public")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      id: string;
      name: string;
      salon_type: SalonType;
      staff_photos_public: boolean;
    }>;
  });

export const updateTenantSalonType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        tenant_id: z.string().uuid(),
        salon_type: z.enum(SALON_TYPES),
        staff_photos_public: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: { salon_type: SalonType; staff_photos_public?: boolean } = {
      salon_type: data.salon_type,
    };
    if (typeof data.staff_photos_public === "boolean")
      patch.staff_photos_public = data.staff_photos_public;
    const { error } = await context.supabase
      .from("tenants")
      .update(patch)
      .eq("id", data.tenant_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const seedServiceTemplates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        tenant_id: z.string().uuid(),
        branch_id: z.string().uuid().optional(),
        salon_type: z.enum(SALON_TYPES).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let branchId = data.branch_id;
    if (!branchId) {
      const { data: b } = await context.supabase
        .from("branches")
        .select("id")
        .eq("tenant_id", data.tenant_id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      branchId = b?.id;
    }
    if (!branchId) throw new Error("No branch found for tenant");
    const { data: out, error } = await context.supabase.rpc("seed_service_templates", {
      _tenant_id: data.tenant_id,
      _branch_id: branchId,
      ...(data.salon_type ? { _salon_type: data.salon_type } : {}),
    });
    if (error) throw new Error(error.message);
    return { inserted: Number(out ?? 0), branch_id: branchId };
  });