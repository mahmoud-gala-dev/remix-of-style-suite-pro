// F2 — Customer self-service portal (no login). Token-scoped access to a
// single booking record. The manage_token is generated server-side at
// booking creation; only someone with the link can view or cancel.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { canCancelBooking } from "@/lib/cancel-policy";

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
    const decision = canCancelBooking(b.status, new Date(b.start_at));
    if (!decision.ok) {
      const msg = decision.reason === "terminal"
        ? "This booking can no longer be cancelled"
        : "Cancellation requires at least 2 hours notice";
      throw new Response(msg, { status: decision.status });
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
    try {
      const { invalidateReportCache } = await import("@/lib/report-cache.server");
      await invalidateReportCache();
    } catch { /* best-effort */ }
    return { ok: true as const };
  });

// F2.b — Customer-facing invoice fetch by booking manage_token.
// Returns the invoice + items + branch name if one exists for this booking.
export const getInvoiceByBookingToken = createServerFn({ method: "GET" })
  .inputValidator((d) => tokenSchema.parse(d))
  .handler(async ({ data }) => {
    await rateLimit(`portal-inv:${data.token}`, { capacity: 30, refillPerMin: 30 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: b, error: bErr } = await supabaseAdmin
      .from("bookings")
      .select("id,branch_id,customer_id")
      .eq("manage_token", data.token)
      .maybeSingle();
    if (bErr) throw new Error(bErr.message);
    if (!b) throw new Response("Not found", { status: 404 });
    const { data: inv } = await supabaseAdmin
      .from("invoices")
      .select("id,number,issued_at,status,subtotal,discount,tax,total")
      .eq("booking_id", b.id)
      .maybeSingle();
    if (!inv) return null;
    const [items, branch, customer] = await Promise.all([
      supabaseAdmin.from("invoice_items").select("description,qty,unit_price,total").eq("invoice_id", inv.id),
      supabaseAdmin.from("branches").select("name_en,name_ar").eq("id", b.branch_id).single(),
      b.customer_id
        ? supabaseAdmin.from("customers").select("name").eq("id", b.customer_id).single()
        : Promise.resolve({ data: null } as const),
    ]);
    return {
      id: inv.id,
      number: inv.number,
      issuedAt: inv.issued_at,
      status: inv.status,
      subtotal: Number(inv.subtotal),
      discount: Number(inv.discount),
      tax: Number(inv.tax),
      total: Number(inv.total),
      items: (items.data ?? []).map((it) => ({
        description: it.description,
        qty: Number(it.qty),
        unitPrice: Number(it.unit_price),
        total: Number(it.total),
      })),
      branch: branch.data,
      customer: customer.data,
    };
  });