import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDown, ArrowUp, Clock } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { Surface } from "@/components/shell/page";
import { StatusPill } from "@/components/shell/status-pill";
import { useCurrentBranch, useData } from "@/lib/store";
import { useT, useI18n } from "@/lib/i18n";
import { fmtMoney, fmtTime, initials, isToday, minutesSince } from "@/lib/format";
import { useMemo } from "react";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard — Vanguard Salon OS" },
      { name: "description", content: "Live overview of bookings, queue and revenue across all branches." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <AppShell>
      <DashboardBody />
    </AppShell>
  );
}

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
  const employeeName = (id: string) =>
    employees.find((e) => e.id === id)
      ? lang === "ar"
        ? employees.find((e) => e.id === id)!.nameAr
        : employees.find((e) => e.id === id)!.nameEn
      : "—";
  const serviceName = (id: string) =>
    services.find((s) => s.id === id)
      ? lang === "ar"
        ? services.find((s) => s.id === id)!.nameAr
        : services.find((s) => s.id === id)!.nameEn
      : "—";

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div>
        <h1 className="font-display text-3xl uppercase tracking-tight">
          {t("dashboard")}
        </h1>
        <p className="text-xs text-dim mt-1">
          {lang === "ar" ? branch.nameAr : branch.nameEn} · {new Date().toLocaleDateString([], { dateStyle: "full" })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label={t("todaysRevenue")} value={fmtMoney(revenueToday)} delta="+12%" up />
        <Kpi label={t("bookingsToday")} value={String(todayBookings.length).padStart(2, "0")} delta={`${Math.max(0, branch.chairs * 8 - todayBookings.length)} slots left`} />
        <Kpi label={t("inQueue")} value={String(inQueue).padStart(2, "0")} delta={inQueue > 3 ? t("high") : "—"} accent={inQueue > 3} />
        <Kpi label={t("avgWait")} value={`${avgWait}m`} delta="↓ 4m faster" up />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today's schedule */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl uppercase tracking-tight">{t("todaysSchedule")}</h2>
            <span className="text-xs text-dim font-mono">{new Date().toLocaleDateString()}</span>
          </div>
          <Surface padded={false}>
            <div className="p-6 space-y-5">
              {todayBookings.length === 0 && (
                <p className="text-sm text-dim text-center py-8">{t("noData")}</p>
              )}
              {todayBookings
                .sort((a, b) => a.start.localeCompare(b.start))
                .map((b, i) => {
                  const current = b.status === "inProgress";
                  return (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex gap-4"
                    >
                      <div className={`w-16 shrink-0 text-xs font-mono pt-1 ${current ? "text-primary" : "text-dim"}`}>
                        {fmtTime(b.start)}
                      </div>
                      <div
                        className={`flex-1 rounded-lg p-4 flex justify-between items-center relative border ${
                          current
                            ? "bg-primary/5 border-primary"
                            : b.status === "completed"
                              ? "border-border/50 opacity-60"
                              : "bg-background border-primary/20"
                        }`}
                      >
                        {current && (
                          <div className="absolute -start-1.5 top-1/2 -translate-y-1/2 size-3 bg-primary rounded-full border-4 border-background" />
                        )}
                        <div>
                          <div className={`text-sm font-semibold ${current ? "text-primary" : ""}`}>
                            {customerName(b.customerId)}
                          </div>
                          <div className="text-[10px] uppercase tracking-widest mt-0.5 text-dim">
                            {serviceName(b.serviceId)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-end hidden sm:block">
                            <div className="text-[10px] text-dim">{t("stylist")}</div>
                            <div className="text-xs">{employeeName(b.employeeId)}</div>
                          </div>
                          <StatusPill status={b.status} />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          </Surface>

          {/* Chart */}
          <Surface>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim">Revenue · 14d</h3>
              <span className="text-xs font-mono">{fmtMoney(chartData.reduce((s, x) => s + x.revenue, 0))}</span>
            </div>
            <div className="h-52">
              <ResponsiveContainer>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--color-dim)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-dim)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    fill="url(#rev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Surface>
        </div>

        {/* Right column */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl uppercase tracking-tight">{t("liveQueue")}</h2>
            <span className="size-2 bg-destructive rounded-full animate-pulse" />
          </div>
          <div className="space-y-3">
            {queue.length === 0 && (
              <Surface><p className="text-sm text-dim">{t("noData")}</p></Surface>
            )}
            {queue.slice(0, 4).map((q, i) => (
              <Surface key={q.id} padded={false} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-surface-2 grid place-items-center text-xs font-bold">
                    #{i + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{customerName(q.customerId)}</div>
                    <div className="text-[10px] text-dim flex items-center gap-1">
                      <Clock className="size-2.5" />
                      {t("waiting")} {minutesSince(q.createdAt)}m
                    </div>
                  </div>
                </div>
                {i === 0 ? (
                  <button className="px-3 py-1.5 bg-primary text-primary-foreground text-[10px] font-bold uppercase rounded-md hover:brightness-110 transition-all">
                    {t("callNext")}
                  </button>
                ) : (
                  <span className="text-[10px] text-dim">{t("pending")}</span>
                )}
              </Surface>
            ))}
          </div>

          <Surface className="bg-primary/5 border-primary/20">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-4">
              {t("topPerforming")}
            </h3>
            <div className="space-y-3">
              {topEmployees.map((e) => (
                <div key={e.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-full bg-surface-2 grid place-items-center text-[10px] font-semibold">
                      {initials(e.nameEn)}
                    </div>
                    <span className="text-sm">{lang === "ar" ? e.nameAr : e.nameEn}</span>
                  </div>
                  <span className="text-sm font-mono">{fmtMoney(e.revenue)}</span>
                </div>
              ))}
              {topEmployees.length === 0 && <p className="text-xs text-dim">{t("noData")}</p>}
            </div>
          </Surface>

          {topServices.length > 0 && (
            <Surface>
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim mb-4">Top Services</h3>
              <div className="space-y-3">
                {topServices.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span>{lang === "ar" ? s.nameAr : s.nameEn}</span>
                    <span className="font-mono text-dim text-xs">×{s.count}</span>
                  </div>
                ))}
              </div>
            </Surface>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  delta,
  up,
  accent,
}: {
  label: string;
  value: string;
  delta?: string;
  up?: boolean;
  accent?: boolean;
}) {
  return (
    <Surface>
      <div className="text-xs text-dim mb-2 uppercase tracking-tight">{label}</div>
      <div className="font-display text-3xl">{value}</div>
      {delta && (
        <div
          className={`mt-2 text-[10px] font-medium flex items-center gap-1 ${
            accent ? "text-primary" : up ? "text-success" : "text-dim"
          }`}
        >
          {up ? <ArrowUp className="size-3" /> : up === false ? <ArrowDown className="size-3" /> : null}
          {delta}
        </div>
      )}
    </Surface>
  );
}
