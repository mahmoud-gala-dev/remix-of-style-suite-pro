import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { useData } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { fmtMoney } from "@/lib/format";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useI18n } from "@/lib/i18n";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/reports")({
  ssr: false,
  head: () => ({ meta: [{ title: "Reports" }] }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});

function Page() {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const branches = useData((s) => s.branches);
  const bookings = useData((s) => s.bookings);
  const services = useData((s) => s.services);

  const byBranch = branches.map((b) => ({
    name: b.nameEn.split(" ")[0],
    revenue: bookings
      .filter((x) => x.branchId === b.id && (x.status === "completed" || x.status === "inProgress"))
      .reduce((s, x) => s + x.price, 0),
  }));

  const byStatus = ["completed", "inProgress", "confirmed", "pending", "cancelled"].map((st) => ({
    name: st,
    value: bookings.filter((b) => b.status === st).length,
  }));

  const COLORS = ["var(--color-primary)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-destructive)"];

  const trend = useMemo(() => {
    const days: { name: string; revenue: number; bookings: number }[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayBookings = bookings.filter((b) => b.start.slice(0, 10) === key);
      days.push({
        name: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        revenue: dayBookings
          .filter((b) => b.status === "completed" || b.status === "inProgress")
          .reduce((s, b) => s + b.price, 0),
        bookings: dayBookings.length,
      });
    }
    return days;
  }, [bookings]);

  const peakHours = useMemo(() => {
    const buckets = Array.from({ length: 12 }, (_, i) => ({
      name: `${i + 9}:00`,
      count: 0,
    }));
    bookings.forEach((b) => {
      const h = new Date(b.start).getHours();
      const idx = h - 9;
      if (idx >= 0 && idx < buckets.length) buckets[idx].count += 1;
    });
    return buckets;
  }, [bookings]);

  const topServices = useMemo(() => {
    const counts = new Map<string, number>();
    bookings.forEach((b) => counts.set(b.serviceId, (counts.get(b.serviceId) ?? 0) + 1));
    return [...counts.entries()]
      .map(([id, count]) => {
        const s = services.find((x) => x.id === id);
        return { name: s ? (lang === "ar" ? s.nameAr : s.nameEn) : "—", count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [bookings, services, lang]);

  const tooltipStyle = {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    fontSize: 12,
  } as const;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      <PageHeader title={t("reports")} subtitle="Cross-branch performance" />

      <Surface>
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim mb-6">
          Revenue · last 30 days
        </h3>
        <div className="h-72">
          <ResponsiveContainer>
            <AreaChart data={trend} margin={{ left: -10, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--color-dim)" fontSize={10} tickLine={false} axisLine={false} interval={3} />
              <YAxis stroke="var(--color-dim)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: number) => fmtMoney(v)} contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Surface>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Surface className="lg:col-span-2">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim mb-6">Revenue by Branch</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={byBranch}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-dim)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-dim)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: number) => fmtMoney(v)} contentStyle={tooltipStyle} />
                <Bar dataKey="revenue" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Surface>

        <Surface>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim mb-6">Bookings by Status</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                  {byStatus.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Surface>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Surface>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim mb-6">Peak hours</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={peakHours}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-dim)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-dim)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Surface>
        <Surface>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim mb-6">Top services</h3>
          <ul className="space-y-3">
            {topServices.map((s, i) => {
              const max = topServices[0]?.count || 1;
              return (
                <li key={i}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium truncate pe-2">{s.name}</span>
                    <span className="font-mono text-xs text-dim">{s.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${(s.count / max) * 100}%` }}
                    />
                  </div>
                </li>
              );
            })}
            {topServices.length === 0 && (
              <li className="text-sm text-dim">{t("noData")}</li>
            )}
          </ul>
        </Surface>
      </div>
    </div>
  );
}
