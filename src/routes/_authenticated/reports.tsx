import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { useT } from "@/lib/i18n";
import { fmtMoney } from "@/lib/format";
import { getReportsSummary, exportReportsCsv, exportReportsRows, exportReportsPdf, getReportsCompare } from "@/lib/reports.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DataState } from "@/components/shell/data-state";
import {
import { RouteError, RouteNotFound } from "@/components/shell/route-error";
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
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/reports")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
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
  const today = new Date().toISOString().slice(0, 10);
  const defaultFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  }, []);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(today);
  const [branchId, setBranchId] = useState<string>("all");
  const fetchReports = useServerFn(getReportsSummary);
  const fetchCsv = useServerFn(exportReportsCsv);
  const fetchRows = useServerFn(exportReportsRows);
  const fetchPdf = useServerFn(exportReportsPdf);
  const fetchCompare = useServerFn(getReportsCompare);
  const { data, isFetching, isLoading, error, refetch } = useQuery({
    queryKey: ["reports", from, to, branchId],
    queryFn: () => fetchReports({ data: { from, to, branchId: branchId === "all" ? null : branchId } }),
  });
  const compareQ = useQuery({
    queryKey: ["reports-compare", from, to, branchId],
    queryFn: () => fetchCompare({ data: { from, to, branchId: branchId === "all" ? null : branchId } }),
  });

  const onExport = async () => {
    try {
      const res = await fetchCsv({ data: { from, to, branchId: branchId === "all" ? null : branchId } });
      const blob = new Blob(["\ufeff" + res.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  };

  const onExportXlsx = async () => {
    try {
      const res = await fetchRows({ data: { from, to, branchId: branchId === "all" ? null : branchId } });
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(res.rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Bookings");
      XLSX.writeFile(wb, `${res.filename}.xlsx`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  };

  const onExportPdf = async () => {
    try {
      const res = await fetchPdf({ data: { from, to, branchId: branchId === "all" ? null : branchId } });
      const bin = atob(res.base64);
      const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      const blob = new Blob([buf], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF export failed");
    }
  };

  const report = data ?? {
    branches: [],
    byBranch: [],
    byStatus: [],
    trend: [],
    peakHours: [],
    topServices: [],
    totals: { bookings: 0, revenue: 0, branches: 0 },
  };

  const COLORS = ["var(--color-primary)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-destructive)"];

  const tooltipStyle = {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    fontSize: 12,
  } as const;

  return (
    <div data-print-root className="p-8 max-w-[1600px] mx-auto space-y-6">
      <PageHeader
        title={t("reports")}
        subtitle={t("reportsSubtitle")}
        actions={
          <div className="flex gap-2" data-no-print>
            <Button variant="outline" size="sm" onClick={onExport}>{t("exportCsv")}</Button>
            <Button variant="outline" size="sm" onClick={onExportXlsx}>{t("exportExcel")}</Button>
            <Button variant="outline" size="sm" onClick={onExportPdf}>{t("exportPdf")}</Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>{t("print")}</Button>
          </div>
        }
      />
      <DataState loading={isLoading && !data} error={error} retry={() => refetch()}>
      <Surface>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="space-y-1.5 text-xs text-dim">
            <span className="block uppercase tracking-wider">{t("from")}</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
          </label>
          <label className="space-y-1.5 text-xs text-dim">
            <span className="block uppercase tracking-wider">{t("to")}</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
          </label>
          <label className="space-y-1.5 text-xs text-dim sm:col-span-2">
            <span className="block uppercase tracking-wider">{t("branch")}</span>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
              <option value="all">{t("allBranches")}</option>
              {report.branches.map((b) => <option key={b.id} value={b.id}>{lang === "ar" ? b.nameAr : b.nameEn}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Metric label={t("revenue")} value={fmtMoney(report.totals.revenue)} />
          <Metric label={t("bookings")} value={String(report.totals.bookings)} />
          <Metric label={t("activeBranches")} value={String(report.totals.branches)} />
        </div>
        {isFetching && <p className="mt-3 text-xs text-dim">{t("loading")}</p>}
      </Surface>

      {compareQ.data && (
        <Surface>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim mb-4">
            {t("comparePrevPeriod")} ({compareQ.data.range.prev_from} → {compareQ.data.range.prev_to})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <CompareMetric
              label={t("revenue")}
              current={fmtMoney(compareQ.data.current.revenue)}
              previous={fmtMoney(compareQ.data.previous.revenue)}
              delta={compareQ.data.delta.revenue}
            />
            <CompareMetric
              label={t("bookings")}
              current={String(compareQ.data.current.bookings)}
              previous={String(compareQ.data.previous.bookings)}
              delta={compareQ.data.delta.bookings}
            />
          </div>
        </Surface>
      )}

      <Surface>
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim mb-6">
          {t("revenueChartTitle")}
        </h3>
        <div className="h-72">
          <ResponsiveContainer>
            <AreaChart data={report.trend} margin={{ left: -10, right: 8, top: 8 }}>
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
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim mb-6">{t("revenueByBranch")}</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={report.byBranch}>
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
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim mb-6">{t("bookingsByStatus")}</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={report.byStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                  {report.byStatus.map((_, i) => (
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
              <BarChart data={report.peakHours}>
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
            {report.topServices.map((s, i) => {
              const max = report.topServices[0]?.count || 1;
              return (
                <li key={s.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium truncate pe-2">{lang === "ar" ? s.nameAr : s.nameEn}</span>
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
            {report.topServices.length === 0 && (
              <li className="text-sm text-dim">{t("noData")}</li>
            )}
          </ul>
        </Surface>
      </div>
      </DataState>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface-2/30 p-3">
      <div className="text-[10px] uppercase tracking-widest text-dim">{label}</div>
      <div className="mt-1 font-display text-2xl">{value}</div>
    </div>
  );
}

function CompareMetric({ label, current, previous, delta }: { label: string; current: string; previous: string; delta: number }) {
  const up = delta > 0;
  const flat = delta === 0;
  const color = flat ? "text-dim" : up ? "text-primary" : "text-destructive";
  return (
    <div className="rounded-md border border-border bg-surface-2/30 p-3">
      <div className="text-[10px] uppercase tracking-widest text-dim">{label}</div>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <div className="font-display text-2xl">{current}</div>
        <div className={`text-xs font-mono ${color}`}>{flat ? "—" : `${up ? "+" : ""}${delta}%`}</div>
      </div>
      <div className="text-[10px] text-dim mt-1">prev {previous}</div>
    </div>
  );
}
