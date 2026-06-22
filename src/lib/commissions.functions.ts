// B — Commissions: read aggregated commissions per employee for a period,
// mark commission lines paid. Auto-population happens via DB trigger when a
// booking moves to status='completed'.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const listCommissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      branchId: z.string().min(1),
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
      employeeId: z.string().uuid().optional(),
      paid: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!UUID_RE.test(data.branchId)) return [];
    let q = context.supabase
      .from("commissions")
      .select("id,booking_id,employee_id,service_price,commission_pct,amount,paid,paid_at,created_at")
      .eq("branch_id", data.branchId)
      .order("created_at", { ascending: false });
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    if (data.employeeId) q = q.eq("employee_id", data.employeeId);
    if (typeof data.paid === "boolean") q = q.eq("paid", data.paid);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const markCommissionPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(500), paid: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const [{ data: admin }, { data: sa }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" }),
    ]);
    if (!admin && !sa) throw new Response("Forbidden", { status: 403 });
    const { error } = await context.supabase
      .from("commissions")
      .update({ paid: data.paid, paid_at: data.paid ? new Date().toISOString() : null })
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });