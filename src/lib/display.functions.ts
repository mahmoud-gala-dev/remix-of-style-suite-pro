import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Public read-only feed for the TV display screen. Returns the live queue
// and next-up bookings for one branch with masked customer names.
export const getBranchDisplay = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ branchId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    const [branch, queue, bookings, customers, employees, services] = await Promise.all([
      supabaseAdmin.from("branches").select("id,name_en,name_ar").eq("id", data.branchId).maybeSingle(),
      supabaseAdmin.from("queue_items").select("id,customer_id,employee_id,service_id,status,position,created_at")
        .eq("branch_id", data.branchId).in("status", ["waiting", "called", "in_progress"]).order("position"),
      supabaseAdmin.from("bookings").select("id,customer_id,employee_id,service_id,start_at,status")
        .eq("branch_id", data.branchId).gte("start_at", todayStart.toISOString()).lte("start_at", todayEnd.toISOString())
        .in("status", ["confirmed", "arrived", "waiting", "in_progress"]).order("start_at"),
      supabaseAdmin.from("customers").select("id,name").eq("branch_id", data.branchId),
      supabaseAdmin.from("employees").select("id,name_en,name_ar").eq("branch_id", data.branchId),
      supabaseAdmin.from("services").select("id,name_en,name_ar").eq("branch_id", data.branchId),
    ]);
    if (!branch.data) throw new Response("Not found", { status: 404 });

    const mask = (n: string) => {
      const parts = n.trim().split(/\s+/);
      return parts.map((p, i) => (i === 0 ? p : (p[0] ?? "") + ".")).join(" ");
    };
    const cmap = new Map((customers.data ?? []).map((c) => [c.id, mask(c.name)]));
    const emap = new Map((employees.data ?? []).map((e) => [e.id, { en: e.name_en, ar: e.name_ar }]));
    const smap = new Map((services.data ?? []).map((s) => [s.id, { en: s.name_en, ar: s.name_ar }]));

    return {
      branch: { id: branch.data.id, nameEn: branch.data.name_en, nameAr: branch.data.name_ar },
      queue: (queue.data ?? []).map((q) => ({
        id: q.id,
        customer: cmap.get(q.customer_id) ?? "—",
        employee: q.employee_id ? emap.get(q.employee_id) ?? null : null,
        service: q.service_id ? smap.get(q.service_id) ?? null : null,
        status: q.status,
        position: q.position,
      })),
      upcoming: (bookings.data ?? []).map((b) => ({
        id: b.id,
        customer: cmap.get(b.customer_id) ?? "—",
        employee: emap.get(b.employee_id) ?? null,
        service: smap.get(b.service_id) ?? null,
        startAt: b.start_at,
        status: b.status,
      })),
    };
  });