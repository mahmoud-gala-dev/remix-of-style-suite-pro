import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { RouteError, RouteNotFound } from "@/components/shell/route-error";
import { useCurrentBranch, useData } from "@/lib/store";
import { useT, useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/format";
import {
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

export const Route = createFileRoute("/_authenticated/bi")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  ssr: false,
  head: () => ({ meta: [{ title: "Business Intelligence" }] }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});

const SEGMENT_COLORS: Record<string, string> = {
  champions: "hsl(var(--color-primary))",
  loyal: "#22c55e",
  potential: "#3b82f6",
  newCustomers: "#a855f7",
  needsAttention: "#f59e0b",
  atRisk: "#ef4444",
  hibernating: "#6b7280",
};

function Page() {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const branch = useCurrentBranch();
  const allBookings = useData((s) => s.bookings);
  const allCustomers = useData((s) => s.customers);

  const bookings = useMemo(
    () => (branch?.id ? allBookings.filter((b) => b.branchId === branch.id) : allBookings),
    [allBookings, branch?.id],
  );
  const customers = useMemo(
    () => (branch?.id ? allCustomers.filter((c) => c.branchId === branch.id) : allCustomers),
    [allCustomers, branch?.id],
  );

  // ===== Funnel =====
  const funnel = useMemo(() => {
    const total = bookings.length;
    const confirmed = bookings.filter((b) =>
      ["confirmed", "arrived", "inProgress", "completed"].includes(b.status),
    ).length;
    const arrived = bookings.filter((b) =>
      ["arrived", "inProgress", "completed"].includes(b.status),
    ).length;
    const completed = bookings.filter((b) => b.status === "completed").length;
    const noShow = bookings.filter((b) => b.status === "noShow").length;
    return { total, confirmed, arrived, completed, noShow };
  }, [bookings]);

  // ===== RFM segmentation =====
  const now = Date.now();
  const rfm = useMemo(() => {
    const completed = bookings.filter((b) => b.status === "completed");
    const perCust = new Map<string, { r: number; f: number; m: number }>();
    for (const b of completed) {
      const e = perCust.get(b.customerId) ?? { r: Infinity, f: 0, m: 0 };
      const daysAgo = Math.max(0, Math.floor((now - new Date(b.end).getTime()) / 86_400_000));
      e.r = Math.min(e.r, daysAgo);
      e.f += 1;
      e.m += b.price;
      perCust.set(b.customerId, e);
    }
    const segs: Record<string, { count: number; ltv: number; ids: string[] }> = {
      champions: { count: 0, ltv: 0, ids: [] },
      loyal: { count: 0, ltv: 0, ids: [] },
      potential: { count: 0, ltv: 0, ids: [] },
      newCustomers: { count: 0, ltv: 0, ids: [] },
      needsAttention: { count: 0, ltv: 0, ids: [] },
      atRisk: { count: 0, ltv: 0, ids: [] },
      hibernating: { count: 0, ltv: 0, ids: [] },
    };
    for (const [id, v] of perCust) {
      let key: keyof typeof segs;
      if (v.r <= 30 && v.f >= 5 && v.m >= 1000) key = "champions";
      else if (v.r <= 60 && v.f >= 3) key = "loyal";
      else if (v.r <= 30 && v.f <= 2) key = "newCustomers";
      else if (v.r <= 60 && v.m >= 500) key = "potential";
      else if (v.r > 60 && v.r <= 120 && v.f >= 3) key = "needsAttention";
      else if (v.r > 90 && v.m >= 500) key = "atRisk";
      else key = "hibernating";
      segs[key].count += 1;
      segs[key].ltv += v.m;
      segs[key].ids.push(id);
    }
    return { segs, perCust };
  }, [bookings, now]);

  const totalLtv = useMemo(
    () => Array.from(rfm.perCust.values()).reduce((s, v) => s + v.m, 0),
    [rfm],
  );
  const avgLtv = rfm.perCust.size > 0 ? totalLtv / rfm.perCust.size : 0;
  const top10 = useMemo(
    () =>
      Array.from(rfm.perCust.entries())
        .map(([id, v]) => ({
          id,
          name: customers.find((c) => c.id === id)?.name ?? id.slice(0, 8),
          ...v,
        }))
        .sort((a, b) => b.m - a.m)
        .slice(0, 10),
    [rfm, customers],
  );

  // ===== Cohort retention (monthly): % of customers whose first visit was in month X
  // who returned in subsequent months.
  const cohorts = useMemo(() => {
    const completed = bookings
      .filter((b) => b.status === "completed")
      .sort((a, b) => a.end.localeCompare(b.end));
    const firstByCustomer = new Map<string, string>(); // customerId -> YYYY-MM
    const visitsByCustomer = new Map<string, Set<string>>(); // customerId -> Set<YYYY-MM>
    for (const b of completed) {
      const ym = b.end.slice(0, 7);
      if (!firstByCustomer.has(b.customerId)) firstByCustomer.set(b.customerId, ym);
      const s = visitsByCustomer.get(b.customerId) ?? new Set<string>();
      s.add(ym);
      visitsByCustomer.set(b.customerId, s);
    }
    const cohortMap = new Map<string, string[]>(); // cohortMonth -> customer ids
    for (const [cid, ym] of firstByCustomer) {
      const list = cohortMap.get(ym) ?? [];
      list.push(cid);
      cohortMap.set(ym, list);
    }
    const months = Array.from(cohortMap.keys()).sort().slice(-6);
    const monthDiff = (a: string, b: string) => {
      const [ay, am] = a.split("-").map(Number);
      const [by, bm] = b.split("-").map(Number);
      return (by - ay) * 12 + (bm - am);
    };
    return months.map((cohort) => {
      const ids = cohortMap.get(cohort) ?? [];
      const buckets = [0, 1, 2, 3].map((offset) => {
        if (ids.length === 0) return 0;
        const target = (() => {
          const [y, m] = cohort.split("-").map(Number);
          const d = new Date(Date.UTC(y, m - 1 + offset, 1));
          return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
        })();
        const retained = ids.filter((cid) => visitsByCustomer.get(cid)?.has(target)).length;
        return Math.round((retained / ids.length) * 100);
      });
      return { cohort, size: ids.length, m0: buckets[0], m1: buckets[1], m2: buckets[2], m3: buckets[3] };
    });
  }, [bookings]);

  const segPie = Object.entries(rfm.segs).map(([k, v]) => ({
    name: t(`bi_seg_${k}` as never),
    value: v.count,
    color: SEGMENT_COLORS[k] ?? "#999",
  }));

  const funnelBars = [
    { stage: t("bi_funnel_total"), value: funnel.total },
    { stage: t("bi_funnel_confirmed"), value: funnel.confirmed },
    { stage: t("bi_funnel_arrived"), value: funnel.arrived },
    { stage: t("bi_funnel_completed"), value: funnel.completed },
  ];

  return (
    <div className="p-4 space-y-4">
      <PageHeader title={t("bi_title")} subtitle={t("bi_sub")} />

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label={t("bi_customers")} value={String(rfm.perCust.size)} />
        <Kpi label={t("bi_avg_ltv")} value={fmtMoney(avgLtv, lang)} />
        <Kpi
          label={t("bi_conversion")}
          value={funnel.total ? `${Math.round((funnel.completed / funnel.total) * 100)}%` : "—"}
        />
        <Kpi
          label={t("bi_noshow_rate")}
          value={funnel.total ? `${Math.round((funnel.noShow / funnel.total) * 100)}%` : "—"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Surface className="p-4">
          <div className="mb-3 text-sm font-medium">{t("bi_funnel_title")}</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelBars} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="stage" width={110} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Surface>

        <Surface className="p-4">
          <div className="mb-3 text-sm font-medium">{t("bi_rfm_title")}</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={segPie} dataKey="value" nameKey="name" outerRadius={90} label>
                  {segPie.map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Surface>
      </div>

      <Surface className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-medium">{t("bi_cohort_title")}</div>
          <div className="text-xs text-muted-foreground">{t("bi_cohort_sub")}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-start text-muted-foreground">
                <th className="p-2 text-start">{t("bi_cohort_month")}</th>
                <th className="p-2 text-start">{t("bi_cohort_size")}</th>
                <th className="p-2">M0</th>
                <th className="p-2">M1</th>
                <th className="p-2">M2</th>
                <th className="p-2">M3</th>
              </tr>
            </thead>
            <tbody>
              {cohorts.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-muted-foreground">
                    {t("bi_empty")}
                  </td>
                </tr>
              )}
              {cohorts.map((c) => (
                <tr key={c.cohort} className="border-t border-border">
                  <td className="p-2 font-medium">{c.cohort}</td>
                  <td className="p-2">{c.size}</td>
                  <RetCell v={c.m0} />
                  <RetCell v={c.m1} />
                  <RetCell v={c.m2} />
                  <RetCell v={c.m3} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Surface>

      <Surface className="p-4">
        <div className="mb-3 text-sm font-medium">{t("bi_top_customers")}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-start text-muted-foreground">
                <th className="p-2 text-start">{t("bi_customer")}</th>
                <th className="p-2">R ({t("bi_days")})</th>
                <th className="p-2">F</th>
                <th className="p-2">{t("bi_ltv")}</th>
              </tr>
            </thead>
            <tbody>
              {top10.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="p-2">{c.name}</td>
                  <td className="p-2 text-center">{c.r === Infinity ? "—" : c.r}</td>
                  <td className="p-2 text-center">{c.f}</td>
                  <td className="p-2 text-end">{fmtMoney(c.m, lang)}</td>
                </tr>
              ))}
              {top10.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-muted-foreground">
                    {t("bi_empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Surface>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Surface className="p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </Surface>
  );
}

function RetCell({ v }: { v: number }) {
  const bg =
    v >= 60
      ? "bg-primary/30"
      : v >= 40
      ? "bg-primary/20"
      : v >= 20
      ? "bg-primary/10"
      : "bg-muted/30";
  return <td className={`p-2 text-center ${bg}`}>{v > 0 ? `${v}%` : "—"}</td>;
}