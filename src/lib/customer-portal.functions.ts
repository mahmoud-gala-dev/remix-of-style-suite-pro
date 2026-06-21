// F2 — Customer self-service portal (no login). Token-scoped access to a
// single booking record. The manage_token is generated server-side at
// booking creation; only someone with the link can view or cancel.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const tokenSchema = z.object({ token: z.string().uuid() });

export const getBookingByToken = createServerFn({ method: "GET" })
  .inputValidator((d) => tokenSchema.parse(d))
  .handler(async ({ data }) => {
    await rateLimit(`portal:${data.token}`, { capacity: 30, refillPerMin: 30 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: b, error } = await supabaseAdmin
      .from("bookings")
      .select("id,start_at,end_at,status,price,branch_id,service_id,employee_id,customer_id")
      .eq("manage_token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!b) throw new Response("Not found", { status: 404 });

    const [branch, service, employee, customer] = await Promise.all([
      supabaseAdmin.from("branches").select("name_en,name_ar,address,phone").eq("id", b.branch_id).single(),
      supabaseAdmin.from("services").select("name_en,name_ar,duration_min").eq("id", b.service_id).single(),
      supabaseAdmin.from("employees").select("name_en,name_ar").eq("id", b.employee_id).single(),
      b.customer_id
        ? supabaseAdmin.from("customers").select("name,phone").eq("id", b.customer_id).single()
        : Promise.resolve({ data: null, error: null } as const),
    ]);
    return {
      id: b.id,
      startAt: b.start_at,
      endAt: b.end_at,
      status: b.status,
      price: Number(b.price),
      branch: branch.data,
      service: service.data,
      employee: employee.data,
      customer: customer.data,
    };
  });

export const cancelBookingByToken = createServerFn({ method: "POST" })
  .inputValidator((d) => tokenSchema.parse(d))
  .handler(async ({ data }) => {
    await rateLimit(`portal-cancel:${data.token}`, { capacity: 5, refillPerMin: 5 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: b, error } = await supabaseAdmin
      .from("bookings")
      .select("id,branch_id,service_id,start_at,status")
      .eq("manage_token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!b) throw new Response("Not found", { status: 404 });
    if (["cancelled", "completed", "no_show"].includes(b.status)) {
      throw new Response("This booking can no longer be cancelled", { status: 400 });
    }
    const hoursAhead = (new Date(b.start_at).getTime() - Date.now()) / 36e5;
    if (hoursAhead < 2) {
      throw new Response("Cancellation requires at least 2 hours notice", { status: 400 });
    }
    const { error: updErr } = await supabaseAdmin
      .from("bookings").update({ status: "cancelled" }).eq("id", b.id);
    if (updErr) throw new Error(updErr.message);

    // F4 — flag matching waitlist entries as notified so staff can act.
    const { data: w } = await supabaseAdmin
      .from("waitlist")
      .select("id")
      .eq("branch_id", b.branch_id)
      .eq("service_id", b.service_id)
      .eq("status", "waiting")
      .limit(10);
    if (w && w.length > 0) {
      await supabaseAdmin
        .from("waitlist")
        .update({ status: "notified", notified_at: new Date().toISOString() })
        .in("id", w.map((x) => x.id));
    }
    return { ok: true as const };
  });