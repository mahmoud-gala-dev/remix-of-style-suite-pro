import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
      .select("id")
      .single();
    if (error) {
      // 23P01 = exclusion_violation from no_overlap constraint.
      const code = (error as { code?: string }).code;
      if (code === "23P01") throw new Response("Time slot already taken", { status: 409 });
      throw new Error(error.message);
    }
    return { ok: true as const, id: row.id };
  });