import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { useData } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { fmtMoney } from "@/lib/format";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/reports")({
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
  const branches = useData((s) => s.branches);
  const bookings = useData((s) => s.bookings);

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

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      <PageHeader title={t("reports")} subtitle="Cross-branch performance" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Surface className="lg:col-span-2">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim mb-6">Revenue by Branch</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={byBranch}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-dim)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-dim)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(v: number) => fmtMoney(v)}
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
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
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Surface>
      </div>
    </div>
  );
}
