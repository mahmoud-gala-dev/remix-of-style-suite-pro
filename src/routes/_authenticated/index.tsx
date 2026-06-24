import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Wand2 } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { useCurrentBranch, useData } from "@/lib/store";
import { useT, useI18n } from "@/lib/i18n";
import { isToday, minutesSince } from "@/lib/format";
import { DashboardKPIs } from "./dashboard/-DashboardKPIs";
import { DashboardSchedule } from "./dashboard/-DashboardSchedule";
import { DashboardSidebar } from "./dashboard/-DashboardSidebar";
import { RouteError, RouteNotFound } from "@/components/shell/route-error";

export const Route = createFileRoute("/_authenticated/")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
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
  const realBranchCount = useData((s) => s.branches.length);
  const bookings = useData((s) => s.bookings).filter((b) => b.branchId === branch?.id);
  const queue = useData((s) => s.queue).filter((q) => q.branchId === branch?.id);
  const employees = useData((s) => s.employees).filter((e) => e.branchId === branch?.id);
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
      const seed = (d.getDate() * 37 + d.getMonth() * 11 + (branch?.id.length ?? 0)) % 100;
      out.push({
        day: d.toLocaleDateString([], { month: "short", day: "numeric" }),
        revenue: 800 + seed * 35,
      });
    }
    out[out.length - 1].revenue = Math.max(out[out.length - 1].revenue, revenueToday);
    return out;
  }, [branch?.id, revenueToday]);

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
      {realBranchCount === 0 && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-display text-lg uppercase tracking-tight flex items-center gap-2">
              <Wand2 className="size-4 text-primary" /> {t("no_branches_cta")}
            </h2>
            <p className="text-xs text-dim mt-1">{t("setup_wizard_sub")}</p>
          </div>
          <Link
            to="/onboarding"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest"
          >
            {t("start_setup")}
          </Link>
        </div>
      )}
      <div>
        <h1 className="font-display text-3xl uppercase tracking-tight">{t("dashboard")}</h1>
        <p className="text-xs text-dim mt-1">
          {branch ? (lang === "ar" ? branch.nameAr : branch.nameEn) : "—"} · {new Date().toLocaleDateString([], { dateStyle: "full" })}
        </p>
      </div>

      <DashboardKPIs
        revenueToday={revenueToday}
        todayCount={todayBookings.length}
        slotsLeft={Math.max(0, (branch?.chairs ?? 0) * 8 - todayBookings.length)}
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
