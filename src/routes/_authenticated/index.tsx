import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { useCurrentBranch, useData } from "@/lib/store";
import { useT, useI18n } from "@/lib/i18n";
import { isToday, minutesSince } from "@/lib/format";
import { DashboardKPIs } from "./dashboard/DashboardKPIs";
import { DashboardSchedule } from "./dashboard/-DashboardSchedule";
import { DashboardSidebar } from "./dashboard/DashboardSidebar";

export const Route = createFileRoute("/_authenticated/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard — Vanguard Salon OS" },
      { name: "description", content: "Live overview of bookings, queue and revenue across all branches." },
    ],
  }),
  component: () => (
    <AppShell>
      <DashboardBody />
    </AppShell>
  ),
});

function DashboardBody() {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const branch = useCurrentBranch();
  const bookings = useData((s) => s.bookings).filter((b) => b.branchId === branch.id);
  const queue = useData((s) => s.queue).filter((q) => q.branchId === branch.id);
  const employees = useData((s) => s.employees).filter((e) => e.branchId === branch.id);
  const services = useData((s) => s.services);
  const customers = useData((s) => s.customers);

  const todayBookings = bookings.filter((b) => isToday(b.start));
  const revenueToday = todayBookings
    .filter((b) => b.status === "completed" || b.status === "inProgress")
    .reduce((s, b) => s + b.price, 0);
  const inQueue = queue.filter((q) => q.status === "waiting" || q.status === "called").length;
  const avgWait = useMemo(() => {
    const waiters = queue.filter((q) => q.status === "waiting");
    if (!waiters.length) return 0;
    return Math.round(waiters.reduce((s, q) => s + minutesSince(q.createdAt), 0) / waiters.length);
  }, [queue]);

  const chartData = useMemo(() => {
    const days = 14;
    const out: { day: string; revenue: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const seed = (d.getDate() * 37 + d.getMonth() * 11 + branch.id.length) % 100;
      out.push({
        day: d.toLocaleDateString([], { month: "short", day: "numeric" }),
        revenue: 800 + seed * 35,
      });
    }
    out[out.length - 1].revenue = Math.max(out[out.length - 1].revenue, revenueToday);
    return out;
  }, [branch.id, revenueToday]);

  const topEmployees = useMemo(() => {
    const map = new Map<string, number>();
    todayBookings.forEach((b) => map.set(b.employeeId, (map.get(b.employeeId) ?? 0) + b.price));
    return employees
      .map((e) => ({ ...e, revenue: map.get(e.id) ?? 0 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);
  }, [todayBookings, employees]);

  const topServices = useMemo(() => {
    const map = new Map<string, number>();
    todayBookings.forEach((b) => map.set(b.serviceId, (map.get(b.serviceId) ?? 0) + 1));
    return services
      .map((s) => ({ ...s, count: map.get(s.id) ?? 0 }))
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [todayBookings, services]);

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? "—";
  const employeeName = (id: string) => {
    const e = employees.find((x) => x.id === id);
    return e ? (lang === "ar" ? e.nameAr : e.nameEn) : "—";
  };
  const serviceName = (id: string) => {
    const s = services.find((x) => x.id === id);
    return s ? (lang === "ar" ? s.nameAr : s.nameEn) : "—";
  };

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div>
        <h1 className="font-display text-3xl uppercase tracking-tight">{t("dashboard")}</h1>
        <p className="text-xs text-dim mt-1">
          {lang === "ar" ? branch.nameAr : branch.nameEn} · {new Date().toLocaleDateString([], { dateStyle: "full" })}
        </p>
      </div>

      <DashboardKPIs
        revenueToday={revenueToday}
        todayCount={todayBookings.length}
        slotsLeft={Math.max(0, branch.chairs * 8 - todayBookings.length)}
        inQueue={inQueue}
        avgWait={avgWait}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <DashboardSchedule
            bookings={todayBookings}
            chartData={chartData}
            customerName={customerName}
            employeeName={employeeName}
            serviceName={serviceName}
          />
        </div>
        <div className="lg:col-span-4">
          <DashboardSidebar
            queue={queue}
            topEmployees={topEmployees}
            topServices={topServices}
            customerName={customerName}
          />
        </div>
      </div>
    </div>
  );
}
