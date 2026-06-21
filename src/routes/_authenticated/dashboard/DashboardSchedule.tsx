import { motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Surface } from "@/components/shell/page";
import { StatusPill } from "@/components/shell/status-pill";
import { useT } from "@/lib/i18n";
import { fmtMoney, fmtTime } from "@/lib/format";
import type { Booking } from "@/types/domain";

type Props = {
  bookings: Booking[];
  chartData: { day: string; revenue: number }[];
  customerName: (id: string) => string;
  employeeName: (id: string) => string;
  serviceName: (id: string) => string;
};

export function DashboardSchedule({ bookings, chartData, customerName, employeeName, serviceName }: Props) {
  const t = useT();
  const sorted = [...bookings].sort((a, b) => a.start.localeCompare(b.start));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl uppercase tracking-tight">{t("todaysSchedule")}</h2>
        <span className="text-xs text-dim font-mono">{new Date().toLocaleDateString()}</span>
      </div>
      <Surface padded={false}>
        <div className="p-6 space-y-5">
          {sorted.length === 0 && (
            <p className="text-sm text-dim text-center py-8">{t("noData")}</p>
          )}
          {sorted.map((b, i) => {
            const current = b.status === "inProgress";
            return (
              <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="flex gap-4">
                <div className={`w-16 shrink-0 text-xs font-mono pt-1 ${current ? "text-primary" : "text-dim"}`}>
                  {fmtTime(b.start)}
                </div>
                <div className={`flex-1 rounded-lg p-4 flex justify-between items-center relative border ${
                  current ? "bg-primary/5 border-primary"
                  : b.status === "completed" ? "border-border/50 opacity-60"
                  : "bg-background border-primary/20"
                }`}>
                  {current && (<div className="absolute -start-1.5 top-1/2 -translate-y-1/2 size-3 bg-primary rounded-full border-4 border-background" />)}
                  <div>
                    <div className={`text-sm font-semibold ${current ? "text-primary" : ""}`}>{customerName(b.customerId)}</div>
                    <div className="text-[10px] uppercase tracking-widest mt-0.5 text-dim">{serviceName(b.serviceId)}</div>
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
              <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Surface>
    </div>
  );
}