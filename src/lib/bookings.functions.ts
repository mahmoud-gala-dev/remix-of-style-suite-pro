import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  branchId: z.string().uuid(),
  customerId: z.string().uuid(),
  employeeId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  price: z.number().nonnegative(),
});

// Public createBooking with server-side overlap check. Rejects with 409 if the
// employee already has a booking in the requested window.
export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Overlap: existing.start < new.end AND existing.end > new.start
    const { data: clash, error: clashErr } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("employee_id", data.employeeId)
      .eq("branch_id", data.branchId)
      .not("status", "in", "(cancelled,no_show)")
      .lt("start_at", data.endAt)
      .gt("end_at", data.startAt)
      .limit(1);
    if (clashErr) throw new Error(clashErr.message);
    if (clash && clash.length > 0) {
      throw new Response("Slot taken", { status: 409 });
    }

    const { data: row, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        branch_id: data.branchId,
        customer_id: data.customerId,
        employee_id: data.employeeId,
        service_id: data.serviceId,
        start_at: data.startAt,
        end_at: data.endAt,
        status: "confirmed",
        price: data.price,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: row.id };
  });