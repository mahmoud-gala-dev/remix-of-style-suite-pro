import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Shared admin-gate for `createServerFn` handlers that already use
 * `requireSupabaseAuth`. Throws 403 if the caller is not admin or super_admin.
 */
export async function requireAdmin(ctx: { supabase: SupabaseClient; userId: string }): Promise<void> {
  const [a, s] = await Promise.all([
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" }),
  ]);
  if (!a.data && !s.data) throw new Response("Forbidden", { status: 403 });
}