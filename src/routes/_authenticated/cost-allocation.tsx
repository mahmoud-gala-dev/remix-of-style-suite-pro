import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { RouteError, RouteNotFound } from "@/components/shell/route-error";
import { useData } from "@/lib/store";
import { useT, useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/format";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_authenticated/cost-allocation")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  ssr: false,
  head: () => ({ meta: [{ title: "Cost allocation" }] }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});

// Platform unit costs (configurable proxies for Worker / DB / Storage spend).
const COST_PER_BOOKING_CENTS = 2; // $0.02 per completed booking
const COST_PER_CUSTOMER_CENTS = 1; // $0.01 per customer (storage + index)
const FIXED_PER_BRANCH = 5; // flat $5/branch baseline

function Page() {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const branches = useData((s) => s.branches);
  const bookings = useData((s) => s.bookings);
  const customers = useData((s) => s.customers);

  const rows = useMemo(() => {
    const out = branches.map((b) => {
      const bk = bookings.filter((x) => x.branchId === b.id);
      const completed = bk.filter((x) => x.status === "completed");
      const cust = customers.filter((c) => c.branchId === b.id);
      const revenue = completed.reduce((s, x) => s + x.price, 0);
      const platformCost =
        FIXED_PER_BRANCH +
        (bk.length * COST_PER_BOOKING_CENTS) / 100 +
        (cust.length * COST_PER_CUSTOMER_CENTS) / 100;
      return {
        id: b.id,
        name: lang === "ar" ? b.nameAr : b.nameEn,
        bookings: bk.length,
        completed: completed.length,
        customers: cust.length,
        revenue,
        platformCost,
        ratio: revenue > 0 ? (platformCost / revenue) * 100 : null,
      };
    });
    return out.sort((a, b) => b.revenue - a.revenue);
  }, [branches, bookings, customers, lang]);

  const totalCost = rows.reduce((s, r) => s + r.platformCost, 0);
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);

  const chartData = rows.map((r) => ({ name: r.name, cost: Number(r.platformCost.toFixed(2)) }));

  return (
    <div className="p-4 space-y-4">
      <PageHeader title={t("cost_alloc_title")} subtitle={t("cost_alloc_sub")} />

      <div className="grid gap-4 md:grid-cols-3">
        <Kpi label={t("cost_alloc_branches")} value={String(rows.length)} />
        <Kpi label={t("cost_alloc_total_cost")} value={fmtMoney(totalCost, lang)} />
        <Kpi
          label={t("cost_alloc_total_ratio")}
          value={totalRevenue > 0 ? `${((totalCost / totalRevenue) * 100).toFixed(2)}%` : "—"}
        />
      </div>

      <Surface className="p-4">
        <div className="mb-3 text-sm font-medium">{t("cost_alloc_chart")}</div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                }}
              />
              <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Surface>

      <Surface className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground text-xs uppercase">
              <th className="p-3 text-start">{t("branches")}</th>
              <th className="p-3 text-end">{t("bookings")}</th>
              <th className="p-3 text-end">{t("customers")}</th>
              <th className="p-3 text-end">{t("acc_revenue")}</th>
              <th className="p-3 text-end">{t("cost_alloc_cost")}</th>
              <th className="p-3 text-end">{t("cost_alloc_ratio")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3 text-end">{r.bookings}</td>
                <td className="p-3 text-end">{r.customers}</td>
                <td className="p-3 text-end">{fmtMoney(r.revenue, lang)}</td>
                <td className="p-3 text-end">{fmtMoney(r.platformCost, lang)}</td>
                <td className="p-3 text-end">
                  {r.ratio === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span className={r.ratio < 5 ? "text-emerald-500" : r.ratio < 15 ? "text-amber-500" : "text-red-500"}>
                      {r.ratio.toFixed(2)}%
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  {t("bi_empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Surface>

      <p className="text-xs text-muted-foreground">
        {t("cost_alloc_note")}
      </p>
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