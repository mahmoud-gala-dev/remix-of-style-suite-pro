import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/require-admin";

const schema = z.object({
  id: z.string().uuid(),
  employeeId: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});

/**
 * Admin-only reschedule for calendar drag-and-drop. Performs the same
 * overlap check as createBooking; relies on the DB exclusion trigger as a
 * second line of defense.
 */
export const rescheduleBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: clash, error: clashErr } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("employee_id", data.employeeId)
      .neq("id", data.id)
      .not("status", "in", "(cancelled,no_show)")
      .lt("start_at", data.endAt)
      .gt("end_at", data.startAt)
      .limit(1);
    if (clashErr) throw new Error(clashErr.message);
    if (clash && clash.length > 0) {
      throw new Response("Slot taken", { status: 409 });
    }

    const { error } = await supabaseAdmin
      .from("bookings")
      .update({
        employee_id: data.employeeId,
        start_at: data.startAt,
        end_at: data.endAt,
      })
      .eq("id", data.id);
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === "23P01") throw new Response("Slot taken", { status: 409 });
      throw new Error(error.message);
    }
    const { invalidateReportCache } = await import("@/lib/report-cache.server");
    await invalidateReportCache();
    return { ok: true as const };
  });