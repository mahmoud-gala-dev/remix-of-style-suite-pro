import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(ctx: { supabase: { rpc: (n: string, a: unknown) => Promise<{ data: unknown }> }; userId: string }) {
  const a = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" });
  if (a.data) return;
  const b = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!b.data) throw new Error("Forbidden: admin required");
}

export const listStaffAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [rolesRes, branchesRes, ubRes] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id,role"),
      supabaseAdmin.from("branches").select("id,name_en,name_ar").order("name_en"),
      supabaseAdmin.from("user_branches").select("user_id,branch_id"),
    ]);
    if (rolesRes.error) throw new Error(rolesRes.error.message);
    if (branchesRes.error) throw new Error(branchesRes.error.message);
    if (ubRes.error) throw new Error(ubRes.error.message);

    const userIds = Array.from(new Set((rolesRes.data ?? []).map((r) => r.user_id)));
    const usersRes = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (usersRes.error) throw new Error(usersRes.error.message);
    const emailMap = new Map(usersRes.data.users.map((u) => [u.id, u.email ?? ""]));

    const rolesByUser = new Map<string, string[]>();
    for (const r of rolesRes.data ?? []) {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    }
    const branchesByUser = new Map<string, string[]>();
    for (const r of ubRes.data ?? []) {
      const arr = branchesByUser.get(r.user_id) ?? [];
      arr.push(r.branch_id);
      branchesByUser.set(r.user_id, arr);
    }
    return {
      branches: branchesRes.data ?? [],
      users: userIds.map((id) => ({
        userId: id,
        email: emailMap.get(id) ?? "",
        roles: rolesByUser.get(id) ?? [],
        branchIds: branchesByUser.get(id) ?? [],
      })),
    };
  });

export const setUserBranches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), branchIds: z.array(z.string().uuid()) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: delErr } = await supabaseAdmin.from("user_branches").delete().eq("user_id", data.userId);
    if (delErr) throw new Error(delErr.message);
    if (data.branchIds.length > 0) {
      const rows = data.branchIds.map((branch_id) => ({ user_id: data.userId, branch_id }));
      const { error } = await supabaseAdmin.from("user_branches").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });