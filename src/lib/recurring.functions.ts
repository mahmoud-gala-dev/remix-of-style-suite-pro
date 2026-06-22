// A1 — Recurring bookings. Admin/staff creates a series of bookings
// (weekly/biweekly/monthly). Each instance gets the same recurrence_group_id
// so the series can later be cancelled or rescheduled as a group.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { expandRecurrence } from "@/lib/recurring";

const schema = z.object({
  branchId: z.string().uuid(),
  customerId: z.string().uuid(),
  employeeId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  price: z.number().nonnegative(),
  pattern: z.enum(["weekly", "biweekly", "monthly"]),
  occurrences: z.number().int().min(2).max(26),
});

export const createRecurringSeries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data, context }) => {
    // Authorize: admin/super_admin OR member of the branch.
    const [{ data: admin }, { data: sa }, { data: ub }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" }),
      context.supabase.from("user_branches").select("branch_id").eq("user_id", context.userId).eq("branch_id", data.branchId).maybeSingle(),
    ]);
    if (!admin && !sa && !ub) throw new Response("Forbidden", { status: 403 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const groupId = crypto.randomUUID();
    const instances = expandRecurrence(
      new Date(data.startAt),
      new Date(data.endAt),
      data.pattern,
      data.occurrences,
    );
    const rows = instances.map(({ start, end }) => ({
        branch_id: data.branchId,
        customer_id: data.customerId,
        employee_id: data.employeeId,
        service_id: data.serviceId,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        status: "confirmed" as const,
        price: data.price,
        recurrence_group_id: groupId,
    }));

    const { data: created, error } = await supabaseAdmin
      .from("bookings")
      .insert(rows)
      .select("id,start_at");
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === "23P01") throw new Response("One of the recurring slots is already taken", { status: 409 });
      throw new Error(error.message);
    }
    return { ok: true as const, groupId, count: created?.length ?? 0 };
  });

export const cancelRecurringSeries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ groupId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: admin }, { data: sa }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" }),
    ]);
    if (!admin && !sa) throw new Response("Forbidden", { status: 403 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("recurrence_group_id", data.groupId)
      .gt("start_at", new Date().toISOString())
      .not("status", "in", "(completed,cancelled,no_show)");
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });