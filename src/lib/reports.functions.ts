import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aggregateReports, REVENUE_STATUSES } from "@/lib/reports-aggregate";

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

    return aggregateReports({
      bookings: bookings ?? [],
      branches: branchesRes.data ?? [],
      services: servicesRes.data ?? [],
      from,
      toExclusive,
      branchId: data.branchId,
    });
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

    // Consolidated on jspdf + jspdf-autotable (single PDF stack across app).
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const branchLabel = data.branchId ? branchMap.get(data.branchId) ?? "Selected branch" : "All branches";
    doc.setFontSize(18);
    doc.text("Vanguard Salon OS — Report", 40, 50);
    doc.setFontSize(10);
    doc.setTextColor(110);
    doc.text(`Period: ${data.from} -> ${data.to}    Branch: ${branchLabel}`, 40, 70);
    doc.setTextColor(20);
    doc.setFontSize(12);
    doc.text("Totals", 40, 100);
    doc.setFontSize(10);
    doc.text(`Bookings: ${all.length}`, 40, 118);
    doc.text(`Revenue:  ${revenue.toFixed(2)}`, 40, 132);
    autoTable(doc, {
      startY: 160,
      head: [["Service", "Bookings", "Revenue"]],
      body: topServices.map((s) => [s.name, String(s.count), s.revenue.toFixed(2)]),
      styles: { fontSize: 10 },
    });
    const base64 = doc.output("datauristring").split(",")[1] ?? "";
    return { base64, filename: `vanguard_report_${data.from}_${data.to}.pdf` };
  });