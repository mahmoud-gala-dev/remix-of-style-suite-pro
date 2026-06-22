/** Bookings statuses that count toward revenue totals. */
export const REVENUE_STATUSES = new Set(["completed", "in_progress"]);

const STATUS_ORDER = ["completed", "in_progress", "confirmed", "pending", "cancelled", "no_show"] as const;
const STATUS_LABELS: Record<string, string> = {
  pending: "pending",
  confirmed: "confirmed",
  arrived: "arrived",
  in_progress: "inProgress",
  completed: "completed",
  cancelled: "cancelled",
  no_show: "noShow",
};

export type BookingRow = {
  branch_id: string;
  service_id: string;
  status: string;
  price: number | string;
  start_at: string; // ISO
};
export type BranchRow = { id: string; name_en: string; name_ar: string };
export type ServiceRow = { id: string; name_en: string; name_ar: string };

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Pure aggregation used by `getReportsSummary`. Excludes I/O so it's unit-testable. */
export function aggregateReports(opts: {
  bookings: BookingRow[];
  branches: BranchRow[];
  services: ServiceRow[];
  from: Date;
  toExclusive: Date;
  branchId?: string | null;
}) {
  const { bookings: rows, branches, services, from, toExclusive, branchId } = opts;
  const branchMap = new Map(branches.map((b) => [b.id, b]));
  const serviceMap = new Map(services.map((s) => [s.id, s]));

  const byBranch = branches
    .filter((b) => !branchId || b.id === branchId)
    .map((b) => ({
      id: b.id,
      name: b.name_en.split(" ")[0],
      revenue: rows
        .filter((x) => x.branch_id === b.id && REVENUE_STATUSES.has(x.status))
        .reduce((sum, x) => sum + Number(x.price), 0),
    }));

  const byStatus = STATUS_ORDER.map((status) => ({
    name: STATUS_LABELS[status] ?? status,
    value: rows.filter((b) => b.status === status).length,
  }));

  const trend: { name: string; revenue: number; bookings: number }[] = [];
  for (let day = new Date(from); day < toExclusive; day = addDays(day, 1)) {
    const key = day.toISOString().slice(0, 10);
    const dayRows = rows.filter((b) => b.start_at.slice(0, 10) === key);
    trend.push({
      name: day.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      revenue: dayRows.filter((b) => REVENUE_STATUSES.has(b.status)).reduce((s, b) => s + Number(b.price), 0),
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
    branches: branches.map((b) => ({ id: b.id, nameEn: b.name_en, nameAr: b.name_ar })),
    byBranch,
    byStatus,
    trend,
    peakHours,
    topServices,
    totals: {
      bookings: rows.length,
      revenue: rows.filter((b) => REVENUE_STATUSES.has(b.status)).reduce((s, b) => s + Number(b.price), 0),
      branches: new Set(rows.map((b) => branchMap.get(b.branch_id)?.id).filter(Boolean)).size,
    },
  };
}