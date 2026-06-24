// Cycle #37 — Admin-only server fns for managing public REST API v1 keys.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertTenantAdmin(
  ctx: { supabase: import("@supabase/supabase-js").SupabaseClient; userId: string },
  tenantId: string,
) {
  const [{ data: isAdmin }, { data: isSuper }] = await Promise.all([
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" }),
  ]);
  if (!isAdmin && !isSuper) throw new Response("Forbidden", { status: 403 });
  // Tenant membership is also enforced by RLS, but check here for a clear error.
  const { data: tenants } = await ctx.supabase.rpc("current_user_tenants");
  const list = Array.isArray(tenants) ? (tenants as string[]) : [];
  if (!isSuper && !list.includes(tenantId)) {
    throw new Response("Forbidden: not a member of tenant", { status: 403 });
  }
}

export const listApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertTenantAdmin(context, data.tenantId);
    const { data: rows, error } = await context.supabase
      .from("api_keys")
      .select("id,name,prefix,scopes,rate_limit_per_min,created_at,last_used_at,revoked_at")
      .eq("tenant_id", data.tenantId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        tenantId: z.string().uuid(),
        name: z.string().trim().min(1).max(120),
        scopes: z.array(z.enum(["read", "write"])).min(1).default(["read"]),
        rateLimitPerMin: z.number().int().min(1).max(6000).default(60),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertTenantAdmin(context, data.tenantId);
    const { mintApiKey } = await import("@/lib/api-key-auth.server");
    const { plaintext, prefix, keyHash } = await mintApiKey();
    const { data: row, error } = await context.supabase
      .from("api_keys")
      .insert({
        tenant_id: data.tenantId,
        name: data.name,
        prefix,
        key_hash: keyHash,
        scopes: data.scopes,
        rate_limit_per_min: data.rateLimitPerMin,
        created_by: context.userId,
      })
      .select("id,name,prefix,scopes,rate_limit_per_min,created_at")
      .single();
    if (error) throw new Error(error.message);
    return { ...row, plaintext };
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error: e1 } = await context.supabase
      .from("api_keys")
      .select("tenant_id")
      .eq("id", data.id)
      .single();
    if (e1 || !row) throw new Error(e1?.message ?? "not found");
    await assertTenantAdmin(context, row.tenant_id);
    const { error } = await context.supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });