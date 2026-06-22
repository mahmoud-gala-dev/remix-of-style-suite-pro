import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  branchId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  customerName: z.string().trim().min(2).max(120).optional(),
  customerPhone: z.string().trim().min(6).max(40).optional(),
  employeeId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  price: z.number().nonnegative(),
  otpCode: z.string().trim().length(6).optional(),
});

export const getPublicBookingCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [branches, services, employees, bookings] = await Promise.all([
    supabaseAdmin.from("branches").select("id,name_en,name_ar,address,phone,chairs,hours_open,hours_close,active").eq("active", true),
    supabaseAdmin.from("services").select("id,branch_id,name_en,name_ar,category,duration_min,price,gender,active").eq("active", true),
    supabaseAdmin.from("employees").select("id,branch_id,name_en,name_ar,phone,role,commission_pct,rating,active").eq("active", true),
    supabaseAdmin.from("bookings").select("id,branch_id,employee_id,service_id,start_at,end_at,status,price").gte("start_at", today.toISOString()),
  ]);
  for (const result of [branches, services, employees, bookings]) {
    if (result.error) throw new Error(result.error.message);
  }
  return {
    branches: (branches.data ?? []).map((b) => ({ id: b.id, nameEn: b.name_en, nameAr: b.name_ar, address: b.address ?? "", phone: b.phone ?? "", chairs: b.chairs, hoursOpen: b.hours_open, hoursClose: b.hours_close, active: b.active })),
    services: (services.data ?? []).map((s) => ({ id: s.id, branchId: s.branch_id, nameEn: s.name_en, nameAr: s.name_ar, category: s.category ?? "", durationMin: s.duration_min, price: Number(s.price), gender: s.gender, active: s.active })),
    employees: (employees.data ?? []).map((e) => ({ id: e.id, branchId: e.branch_id, nameEn: e.name_en, nameAr: e.name_ar, phone: e.phone ?? "", role: e.role, commissionPct: Number(e.commission_pct), rating: Number(e.rating), active: e.active })),
    bookings: (bookings.data ?? []).map((b) => ({ id: b.id, branchId: b.branch_id, employeeId: b.employee_id, serviceId: b.service_id, start: b.start_at, end: b.end_at, status: b.status === "in_progress" ? "inProgress" : b.status === "no_show" ? "noShow" : b.status, price: Number(b.price) })),
  };
});

// Public createBooking with server-side overlap check. Rejects with 409 if the
// employee already has a booking in the requested window.
export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // P74 — rate-limit by phone (anon endpoint).
    await rateLimit(`createBooking:${data.customerPhone ?? data.customerId ?? "anon"}`, { capacity: 10, refillPerMin: 10 });

    // OTP gate (configurable via app_settings.booking_otp_required).
    const { data: setting } = await supabaseAdmin
      .from("app_settings").select("value").eq("key", "booking_otp_required").maybeSingle();
    if (setting?.value === true) {
      if (!data.customerPhone || !data.otpCode) {
        throw new Response("OTP required", { status: 401 });
      }
      const { data: ok, error: otpErr } = await supabaseAdmin.rpc("verify_otp", {
        p_phone: data.customerPhone, p_code: data.otpCode,
      });
      if (otpErr) throw new Error(otpErr.message);
      if (!ok) throw new Response("Invalid or expired OTP", { status: 401 });
    }

    const { data: service, error: serviceErr } = await supabaseAdmin
      .from("services")
      .select("id,branch_id,price,active")
      .eq("id", data.serviceId)
      .eq("branch_id", data.branchId)
      .eq("active", true)
      .single();
    if (serviceErr || !service) throw new Error("Service is not available");

    const { data: employee, error: employeeErr } = await supabaseAdmin
      .from("employees")
      .select("id,branch_id,active")
      .eq("id", data.employeeId)
      .eq("branch_id", data.branchId)
      .eq("active", true)
      .single();
    if (employeeErr || !employee) throw new Error("Employee is not available");

    // P52 — per-employee shifts + days-off enforcement.
    // Shifts are optional: if none defined for the employee, fall back to branch hours.
    {
      const startDate = new Date(data.startAt);
      const endDate = new Date(data.endAt);
      const dayStr = startDate.toISOString().slice(0, 10);
      const [{ data: dayOff }, { data: shifts }] = await Promise.all([
        supabaseAdmin.from("employee_days_off").select("id").eq("employee_id", data.employeeId).eq("day", dayStr).maybeSingle(),
        supabaseAdmin.from("employee_shifts").select("weekday,start_time,end_time").eq("employee_id", data.employeeId),
      ]);
      if (dayOff) throw new Response("Employee is off on this day", { status: 409 });
      if (shifts && shifts.length > 0) {
        const weekday = startDate.getUTCDay();
        const toMin = (t: string) => {
          const [h, m] = t.split(":").map(Number);
          return h * 60 + m;
        };
        const startMin = startDate.getUTCHours() * 60 + startDate.getUTCMinutes();
        const endMin = endDate.getUTCHours() * 60 + endDate.getUTCMinutes();
        const inShift = shifts.some((s) =>
          s.weekday === weekday && toMin(s.start_time) <= startMin && toMin(s.end_time) >= endMin,
        );
        if (!inShift) throw new Response("Outside employee working hours", { status: 409 });
      }
    }

    let customerId = data.customerId;
    if (!customerId) {
      if (!data.customerName || !data.customerPhone) throw new Error("Customer details are required");
      const { data: existing, error: findErr } = await supabaseAdmin
        .from("customers")
        .select("id")
        .eq("branch_id", data.branchId)
        .eq("phone", data.customerPhone)
        .maybeSingle();
      if (findErr) throw new Error(findErr.message);
      if (existing) {
        customerId = existing.id;
      } else {
        const { data: created, error: createErr } = await supabaseAdmin
          .from("customers")
          .insert({ branch_id: data.branchId, name: data.customerName, phone: data.customerPhone })
          .select("id")
          .single();
        if (createErr) throw new Error(createErr.message);
        customerId = created.id;
      }
    }

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
        customer_id: customerId,
        employee_id: data.employeeId,
        service_id: data.serviceId,
        start_at: data.startAt,
        end_at: data.endAt,
        status: "confirmed",
        price: Number(service.price),
      })
      .select("id,manage_token")
      .single();
    if (error) {
      // 23P01 = exclusion_violation from no_overlap constraint.
      const code = (error as { code?: string }).code;
      if (code === "23P01") throw new Response("Time slot already taken", { status: 409 });
      throw new Error(error.message);
    }
    // P35 — fire webhooks for booking.created (fire-and-forget, never blocks).
    try {
      const { data: hooks } = await supabaseAdmin
        .from("webhooks").select("id,url").eq("event", "booking.created").eq("enabled", true);
      if (hooks?.length) {
        const payload = {
          id: row.id, branch_id: data.branchId, customer_id: customerId,
          employee_id: data.employeeId, service_id: data.serviceId,
          start_at: data.startAt, end_at: data.endAt, price: Number(service.price),
        };
        await Promise.all(hooks.map(async (h) => {
          let status = 0; let body = "";
          try {
            const res = await fetch(h.url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ event: "booking.created", payload, ts: new Date().toISOString() }),
            });
            status = res.status;
            body = (await res.text()).slice(0, 500);
          } catch (e) {
            body = e instanceof Error ? e.message : String(e);
          }
          await supabaseAdmin.from("webhook_deliveries").insert({
            webhook_id: h.id, event: "booking.created", payload, status, response: body,
          });
        }));
      }
    } catch { /* swallow — webhook failure must not break booking */ }
    // Web Push — best-effort broadcast to staff/admins with push subscriptions.
    try {
      const { broadcastWebPush } = await import("./push.server");
      await broadcastWebPush({
        title: "New booking",
        body: new Date(data.startAt).toLocaleString(),
        url: "/bookings",
        tag: `booking-${row.id}`,
      });
    } catch { /* push failures must not break booking */ }
    // Best-effort WhatsApp confirmation to the customer when Twilio is enabled.
    if (data.customerPhone) {
      try {
        const { sendWhatsappInternal } = await import("./twilio.functions");
        const when = new Date(data.startAt).toLocaleString();
        await sendWhatsappInternal(
          data.customerPhone,
          `Booking confirmed for ${when}. Manage: ${row.manage_token ? `/my/${row.manage_token}` : "(see email)"}`,
        );
      } catch { /* Twilio failures must not break booking */ }
    }
    // Best-effort Resend email confirmation when notifications are enabled.
    try {
      const { data: cust } = await supabaseAdmin
        .from("customers").select("name,email").eq("id", customerId!).maybeSingle();
      if (cust?.email) {
        const { sendBookingConfirmationEmail } = await import("./notifications.server");
        await sendBookingConfirmationEmail({
          to: cust.email,
          customerName: cust.name ?? data.customerName ?? "there",
          whenIso: data.startAt,
          manageUrl: row.manage_token ? `/my/${row.manage_token}` : undefined,
        });
      }
    } catch { /* email failures must not break booking */ }
    return { ok: true as const, id: row.id, manageToken: row.manage_token as string };
  });