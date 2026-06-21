import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  branchId: z.string().uuid().nullable().optional(),
});

const revenueStatuses = new Set(["completed", "in_progress"]);
const statusLabels: Record<string, string> = {
  pending: "pending",
  confirmed: "confirmed",
  arrived: "arrived",
  in_progress: "inProgress",
  completed: "completed",
  cancelled: "cancelled",
  no_show: "noShow",
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export const getReportsSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const from = new Date(`${data.from}T00:00:00.000Z`);
    const toExclusive = addDays(new Date(`${data.to}T00:00:00.000Z`), 1);
    if (Number.isNaN(from.getTime()) || Number.isNaN(toExclusive.getTime()) || from >= toExclusive) {
      throw new Error("Invalid report range");
    }

    const [branchesRes, servicesRes] = await Promise.all([
      context.supabase.from("branches").select("id,name_en,name_ar").order("name_en"),
      context.supabase.from("services").select("id,name_en,name_ar"),
    ]);
    if (branchesRes.error) throw new Error(branchesRes.error.message);
    if (servicesRes.error) throw new Error(servicesRes.error.message);

    let bookingsQuery = context.supabase
      .from("bookings")
      .select("id,branch_id,service_id,start_at,status,price")
      .gte("start_at", from.toISOString())
      .lt("start_at", toExclusive.toISOString());
    if (data.branchId) bookingsQuery = bookingsQuery.eq("branch_id", data.branchId);
    const { data: bookings, error } = await bookingsQuery;
    if (error) throw new Error(error.message);

    const branchMap = new Map((branchesRes.data ?? []).map((b) => [b.id, b]));
    const serviceMap = new Map((servicesRes.data ?? []).map((s) => [s.id, s]));
    const rows = bookings ?? [];

    const byBranch = (branchesRes.data ?? [])
      .filter((b) => !data.branchId || b.id === data.branchId)
      .map((b) => ({
        id: b.id,
        name: b.name_en.split(" ")[0],
        revenue: rows
          .filter((x) => x.branch_id === b.id && revenueStatuses.has(x.status))
          .reduce((sum, x) => sum + Number(x.price), 0),
      }));

    const statusOrder = ["completed", "in_progress", "confirmed", "pending", "cancelled", "no_show"];
    const byStatus = statusOrder.map((status) => ({
      name: statusLabels[status] ?? status,
      value: rows.filter((b) => b.status === status).length,
    }));

    const trend: { name: string; revenue: number; bookings: number }[] = [];
    for (let day = new Date(from); day < toExclusive; day = addDays(day, 1)) {
      const key = day.toISOString().slice(0, 10);
      const dayRows = rows.filter((b) => b.start_at.slice(0, 10) === key);
      trend.push({
        name: day.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        revenue: dayRows.filter((b) => revenueStatuses.has(b.status)).reduce((sum, b) => sum + Number(b.price), 0),
        bookings: dayRows.length,
      });
    }

    const peakHours = Array.from({ length: 12 }, (_, i) => ({ name: `${i + 9}:00`, count: 0 }));
    rows.forEach((b) => {
      const idx = new Date(b.start_at).getHours() - 9;
      if (idx >= 0 && idx < peakHours.length) peakHours[idx].count += 1;
    });

    const serviceCounts = new Map<string, number>();
    rows.forEach((b) => serviceCounts.set(b.service_id, (serviceCounts.get(b.service_id) ?? 0) + 1));
    const topServices = [...serviceCounts.entries()]
      .map(([id, count]) => ({
        id,
        nameEn: serviceMap.get(id)?.name_en ?? "—",
        nameAr: serviceMap.get(id)?.name_ar ?? "—",
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return {
      branches: (branchesRes.data ?? []).map((b) => ({ id: b.id, nameEn: b.name_en, nameAr: b.name_ar })),
      byBranch,
      byStatus,
      trend,
      peakHours,
      topServices,
      totals: {
        bookings: rows.length,
        revenue: rows.filter((b) => revenueStatuses.has(b.status)).reduce((sum, b) => sum + Number(b.price), 0),
        branches: new Set(rows.map((b) => branchMap.get(b.branch_id)?.id).filter(Boolean)).size,
      },
    };
  });

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Prompt 16: CSV export — returns a CSV string of bookings in the selected range.
export const exportReportsCsv = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const from = new Date(`${data.from}T00:00:00.000Z`);
    const toExclusive = addDays(new Date(`${data.to}T00:00:00.000Z`), 1);
    let q = context.supabase
      .from("bookings")
      .select("id,branch_id,service_id,employee_id,customer_id,start_at,end_at,status,price")
      .gte("start_at", from.toISOString())
      .lt("start_at", toExclusive.toISOString())
      .order("start_at", { ascending: true });
    if (data.branchId) q = q.eq("branch_id", data.branchId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const header = ["id", "branch_id", "service_id", "employee_id", "customer_id", "start_at", "end_at", "status", "price"];
    const lines = [header.join(",")];
    for (const r of rows ?? []) lines.push(header.map((k) => csvEscape((r as Record<string, unknown>)[k])).join(","));
    return { csv: lines.join("\n"), filename: `bookings_${data.from}_${data.to}.csv` };
  });

// Prompt 24: rows export for xlsx/PDF — returns booking rows as JSON.
export const exportReportsRows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const from = new Date(`${data.from}T00:00:00.000Z`);
    const toExclusive = addDays(new Date(`${data.to}T00:00:00.000Z`), 1);
    let q = context.supabase
      .from("bookings")
      .select("id,branch_id,service_id,employee_id,customer_id,start_at,end_at,status,price")
      .gte("start_at", from.toISOString())
      .lt("start_at", toExclusive.toISOString())
      .order("start_at", { ascending: true });
    if (data.branchId) q = q.eq("branch_id", data.branchId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], filename: `bookings_${data.from}_${data.to}` };
  });