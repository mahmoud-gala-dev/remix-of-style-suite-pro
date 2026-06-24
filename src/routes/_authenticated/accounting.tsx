import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { RouteError, RouteNotFound } from "@/components/shell/route-error";
import { useCurrentBranch, useData } from "@/lib/store";
import { useT, useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/_authenticated/accounting")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  ssr: false,
  head: () => ({ meta: [{ title: "Accounting" }] }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});

function Page() {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const branch = useCurrentBranch();
  const allBookings = useData((s) => s.bookings);
  const services = useData((s) => s.services);

  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  }, []);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);

  const bookings = useMemo(
    () =>
      allBookings.filter((b) => {
        if (branch?.id && b.branchId !== branch.id) return false;
        const day = b.end.slice(0, 10);
        return day >= from && day <= to && b.status === "completed";
      }),
    [allBookings, branch?.id, from, to],
  );

  const revenue = bookings.reduce((s, b) => s + b.price, 0);
  // Heuristic OPEX estimate (no expense rows in the in-memory store):
  // commission ~35% + overhead ~15% of revenue.
  const commission = revenue * 0.35;
  const overhead = revenue * 0.15;
  const cogs = commission + overhead;
  const net = revenue - cogs;
  const margin = revenue > 0 ? (net / revenue) * 100 : 0;

  const dailyCashFlow = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bookings) {
      const d = b.end.slice(0, 10);
      map.set(d, (map.get(d) ?? 0) + b.price);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, amount]) => ({ day: day.slice(5), revenue: amount }));
  }, [bookings]);

  // Revenue by service category (proxy for chart-of-accounts revenue lines)
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bookings) {
      const svc = services.find((s) => s.id === b.serviceId);
      const cat = svc?.category ?? "uncategorized";
      map.set(cat, (map.get(cat) ?? 0) + b.price);
    }
    return Array.from(map.entries()).sort(([, a], [, b]) => b - a);
  }, [bookings, services]);

  function download(filename: string, content: string, mime: string) {
    const blob = new Blob(["\ufeff" + content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // QuickBooks / Zoho-friendly journal CSV (3-column GL: Date, Account, Debit/Credit)
  function exportJournal() {
    const header = ["Date", "JournalNo", "Account", "Description", "Debit", "Credit", "Currency"];
    const lines: string[] = [header.join(",")];
    bookings.forEach((b, i) => {
      const date = b.end.slice(0, 10);
      const svc = services.find((s) => s.id === b.serviceId);
      const acct = `Revenue:${(svc?.category ?? "Services").replace(/,/g, " ")}`;
      const memo = (svc?.nameEn ?? "Service").replace(/,/g, " ");
      const jn = `JE-${date.replace(/-/g, "")}-${i + 1}`;
      lines.push([date, jn, "Cash", memo, b.price.toFixed(2), "0.00", "SAR"].join(","));
      lines.push([date, jn, acct, memo, "0.00", b.price.toFixed(2), "SAR"].join(","));
    });
    download(`journal-${from}-to-${to}.csv`, lines.join("\n"), "text/csv");
  }

  function exportPnl() {
    const rows = [
      ["Section", "Account", "Amount"],
      ["Revenue", "Service Revenue", revenue.toFixed(2)],
      ...byCategory.map(([cat, amt]) => ["Revenue Detail", cat, amt.toFixed(2)]),
      ["COGS", "Commissions (est. 35%)", commission.toFixed(2)],
      ["OPEX", "Overhead (est. 15%)", overhead.toFixed(2)],
      ["Result", "Net Income", net.toFixed(2)],
      ["Result", "Net Margin %", margin.toFixed(2)],
    ];
    download(`pnl-${from}-to-${to}.csv`, rows.map((r) => r.join(",")).join("\n"), "text/csv");
  }

  return (
    <div className="p-4 space-y-4">
      <PageHeader title={t("acc_title")} subtitle={t("acc_sub")} />

      <Surface className="p-3 flex flex-wrap items-end gap-3">
        <Field label={t("from")}>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm"
          />
        </Field>
        <Field label={t("to")}>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm"
          />
        </Field>
        <div className="ms-auto flex gap-2">
          <Button variant="outline" onClick={exportPnl}>
            <Download className="me-1 size-4" />
            {t("acc_export_pnl")}
          </Button>
          <Button onClick={exportJournal}>
            <Download className="me-1 size-4" />
            {t("acc_export_journal")}
          </Button>
        </div>
      </Surface>

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label={t("acc_revenue")} value={fmtMoney(revenue, lang)} />
        <Kpi label={t("acc_cogs")} value={fmtMoney(cogs, lang)} tone="warning" />
        <Kpi label={t("acc_net")} value={fmtMoney(net, lang)} tone={net >= 0 ? "good" : "bad"} />
        <Kpi label={t("acc_margin")} value={`${margin.toFixed(1)}%`} />
      </div>

      <Surface className="p-4">
        <div className="mb-3 text-sm font-medium">{t("acc_cashflow")}</div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyCashFlow}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Surface>

      <div className="grid gap-4 lg:grid-cols-2">
        <Surface className="p-4">
          <div className="mb-3 text-sm font-medium">{t("acc_pnl_title")}</div>
          <table className="w-full text-sm">
            <tbody>
              <PnlRow label={t("acc_revenue")} value={revenue} lang={lang} bold />
              {byCategory.map(([cat, amt]) => (
                <PnlRow key={cat} label={`  · ${cat}`} value={amt} lang={lang} muted />
              ))}
              <PnlRow label={t("acc_commissions")} value={-commission} lang={lang} />
              <PnlRow label={t("acc_overhead")} value={-overhead} lang={lang} />
              <tr className="border-t-2 border-border">
                <td className="p-2 font-semibold">{t("acc_net")}</td>
                <td
                  className={`p-2 text-end font-semibold ${
                    net >= 0 ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {fmtMoney(net, lang)}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground">{t("acc_estimate_note")}</p>
        </Surface>

        <Surface className="p-4">
          <div className="mb-3 text-sm font-medium">{t("acc_revenue_by_cat")}</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground">
                <th className="p-2 text-start">{t("acc_account")}</th>
                <th className="p-2 text-end">{t("acc_amount")}</th>
                <th className="p-2 text-end">%</th>
              </tr>
            </thead>
            <tbody>
              {byCategory.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-muted-foreground">
                    {t("bi_empty")}
                  </td>
                </tr>
              )}
              {byCategory.map(([cat, amt]) => (
                <tr key={cat} className="border-t border-border">
                  <td className="p-2">{cat}</td>
                  <td className="p-2 text-end">{fmtMoney(amt, lang)}</td>
                  <td className="p-2 text-end text-muted-foreground">
                    {revenue > 0 ? `${Math.round((amt / revenue) * 100)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Surface>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad" | "warning";
}) {
  const cls =
    tone === "good"
      ? "text-emerald-500"
      : tone === "bad"
      ? "text-red-500"
      : tone === "warning"
      ? "text-amber-500"
      : "";
  return (
    <Surface className="p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${cls}`}>{value}</div>
    </Surface>
  );
}

function PnlRow({
  label,
  value,
  lang,
  bold,
  muted,
}: {
  label: string;
  value: number;
  lang: "en" | "ar";
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <tr className="border-t border-border">
      <td className={`p-2 ${bold ? "font-semibold" : ""} ${muted ? "text-muted-foreground" : ""}`}>
        {label}
      </td>
      <td
        className={`p-2 text-end ${bold ? "font-semibold" : ""} ${
          muted ? "text-muted-foreground" : ""
        }`}
      >
        {fmtMoney(value, lang)}
      </td>
    </tr>
  );
}