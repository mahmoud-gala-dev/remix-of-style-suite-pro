import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const inputSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  branchId: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v && UUID_RE.test(v) ? v : null)),
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

// P64 — compare current period with the immediately preceding equal-length period.
export const getReportsCompare = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const from = new Date(`${data.from}T00:00:00.000Z`);
    const toExclusive = addDays(new Date(`${data.to}T00:00:00.000Z`), 1);
    const lengthMs = toExclusive.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - lengthMs);
    const prevTo = from;

    async function totals(start: Date, end: Date) {
      let q = context.supabase
        .from("bookings")
        .select("price,status")
        .gte("start_at", start.toISOString())
        .lt("start_at", end.toISOString());
      if (data.branchId) q = q.eq("branch_id", data.branchId);
      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);
      const revenue = (rows ?? [])
        .filter((r) => revenueStatuses.has(r.status))
        .reduce((s, r) => s + Number(r.price), 0);
      return { bookings: rows?.length ?? 0, revenue };
    }

    const [current, previous] = await Promise.all([
      totals(from, toExclusive),
      totals(prevFrom, prevTo),
    ]);
    const pct = (cur: number, prev: number) =>
      prev === 0 ? (cur === 0 ? 0 : 100) : Math.round(((cur - prev) / prev) * 100);
    return {
      current,
      previous,
      delta: {
        bookings: pct(current.bookings, previous.bookings),
        revenue: pct(current.revenue, previous.revenue),
      },
      range: { from: data.from, to: data.to, prev_from: prevFrom.toISOString().slice(0, 10), prev_to: prevTo.toISOString().slice(0, 10) },
    };
  });

// P6 — Server-rendered PDF summary. Returns a base64 PDF so the client can
// trigger a download without a separate streaming endpoint.
export const exportReportsPdf = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const from = new Date(`${data.from}T00:00:00.000Z`);
    const toExclusive = addDays(new Date(`${data.to}T00:00:00.000Z`), 1);
    let q = context.supabase
      .from("bookings")
      .select("branch_id,service_id,status,price,start_at")
      .gte("start_at", from.toISOString())
      .lt("start_at", toExclusive.toISOString());
    if (data.branchId) q = q.eq("branch_id", data.branchId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const [branchesRes, servicesRes] = await Promise.all([
      context.supabase.from("branches").select("id,name_en"),
      context.supabase.from("services").select("id,name_en"),
    ]);
    const branchMap = new Map((branchesRes.data ?? []).map((b) => [b.id, b.name_en]));
    const serviceMap = new Map((servicesRes.data ?? []).map((s) => [s.id, s.name_en]));
    const all = rows ?? [];
    const revenue = all.filter((r) => revenueStatuses.has(r.status)).reduce((s, r) => s + Number(r.price), 0);

    const serviceCounts = new Map<string, { count: number; revenue: number }>();
    for (const r of all) {
      const cur = serviceCounts.get(r.service_id) ?? { count: 0, revenue: 0 };
      cur.count += 1;
      if (revenueStatuses.has(r.status)) cur.revenue += Number(r.price);
      serviceCounts.set(r.service_id, cur);
    }
    const topServices = [...serviceCounts.entries()]
      .map(([id, v]) => ({ name: serviceMap.get(id) ?? "—", ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]); // A4
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const ink = rgb(0.07, 0.07, 0.08);
    const dim = rgb(0.4, 0.4, 0.45);
    let y = 800;
    page.drawText("Vanguard Salon OS — Report", { x: 40, y, size: 18, font: bold, color: ink });
    y -= 24;
    const branchLabel = data.branchId ? branchMap.get(data.branchId) ?? "Selected branch" : "All branches";
    page.drawText(`Period: ${data.from} → ${data.to}    Branch: ${branchLabel}`, {
      x: 40, y, size: 10, font, color: dim,
    });
    y -= 30;
    page.drawText("Totals", { x: 40, y, size: 12, font: bold, color: ink }); y -= 16;
    page.drawText(`Bookings: ${all.length}`, { x: 40, y, size: 10, font, color: ink }); y -= 14;
    page.drawText(`Revenue:  ${revenue.toFixed(2)}`, { x: 40, y, size: 10, font, color: ink }); y -= 24;

    page.drawText("Top services", { x: 40, y, size: 12, font: bold, color: ink }); y -= 16;
    page.drawText("Service", { x: 40, y, size: 9, font: bold, color: dim });
    page.drawText("Bookings", { x: 360, y, size: 9, font: bold, color: dim });
    page.drawText("Revenue", { x: 470, y, size: 9, font: bold, color: dim });
    y -= 12;
    for (const s of topServices) {
      if (y < 60) break;
      const name = s.name.length > 55 ? `${s.name.slice(0, 52)}…` : s.name;
      page.drawText(name, { x: 40, y, size: 10, font, color: ink });
      page.drawText(String(s.count), { x: 360, y, size: 10, font, color: ink });
      page.drawText(s.revenue.toFixed(2), { x: 470, y, size: 10, font, color: ink });
      y -= 14;
    }

    const bytes = await pdf.saveAsBase64();
    return { base64: bytes, filename: `vanguard_report_${data.from}_${data.to}.pdf` };
  });