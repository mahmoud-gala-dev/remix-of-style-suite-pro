import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/require-admin";

const timeRe = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const dayRe = /^\d{4}-\d{2}-\d{2}$/;

export const listShifts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ employeeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await requireAdmin(context);
    const [shifts, daysOff] = await Promise.all([
      supabaseAdmin
        .from("employee_shifts")
        .select("id,weekday,start_time,end_time")
        .eq("employee_id", data.employeeId)
        .order("weekday"),
      supabaseAdmin
        .from("employee_days_off")
        .select("id,day,reason")
        .eq("employee_id", data.employeeId)
        .order("day"),
    ]);
    if (shifts.error) throw new Error(shifts.error.message);
    if (daysOff.error) throw new Error(daysOff.error.message);
    return { shifts: shifts.data ?? [], daysOff: daysOff.data ?? [] };
  });

export const addShift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        employeeId: z.string().uuid(),
        weekday: z.number().int().min(0).max(6),
        startTime: z.string().regex(timeRe),
        endTime: z.string().regex(timeRe),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await requireAdmin(context);
    if (data.startTime >= data.endTime) throw new Error("End time must be after start time");
    const { error } = await supabaseAdmin.from("employee_shifts").insert({
      employee_id: data.employeeId,
      weekday: data.weekday,
      start_time: data.startTime,
      end_time: data.endTime,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteShift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await requireAdmin(context);
    const { error } = await supabaseAdmin.from("employee_shifts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addDayOff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        employeeId: z.string().uuid(),
        day: z.string().regex(dayRe),
        reason: z.string().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await requireAdmin(context);
    const { error } = await supabaseAdmin.from("employee_days_off").insert({
      employee_id: data.employeeId,
      day: data.day,
      reason: data.reason ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDayOff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await requireAdmin(context);
    const { error } = await supabaseAdmin.from("employee_days_off").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });