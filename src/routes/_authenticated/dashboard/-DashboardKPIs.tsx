import { ArrowUp, ArrowDown } from "lucide-react";
import { Surface } from "@/components/shell/page";
import { useT } from "@/lib/i18n";
import { fmtMoney } from "@/lib/format";

type Props = {
  revenueToday: number;
  todayCount: number;
  slotsLeft: number;
  inQueue: number;
  avgWait: number;
};

export function DashboardKPIs({ revenueToday, todayCount, slotsLeft, inQueue, avgWait }: Props) {
  const t = useT();
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Kpi label={t("todaysRevenue")} value={fmtMoney(revenueToday)} delta="+12%" up />
      <Kpi label={t("bookingsToday")} value={String(todayCount).padStart(2, "0")} delta={`${slotsLeft} slots left`} />
      <Kpi label={t("inQueue")} value={String(inQueue).padStart(2, "0")} delta={inQueue > 3 ? t("high") : "—"} accent={inQueue > 3} />
      <Kpi label={t("avgWait")} value={`${avgWait}m`} delta="↓ 4m faster" up />
    </div>
  );
}

function Kpi({
  label, value, delta, up, accent,
}: { label: string; value: string; delta?: string; up?: boolean; accent?: boolean }) {
  return (
    <Surface>
      <div className="text-xs text-dim mb-2 uppercase tracking-tight">{label}</div>
      <div className="font-display text-3xl">{value}</div>
      {delta && (
        <div className={`mt-2 text-[10px] font-medium flex items-center gap-1 ${accent ? "text-primary" : up ? "text-success" : "text-dim"}`}>
          {up ? <ArrowUp className="size-3" /> : up === false ? <ArrowDown className="size-3" /> : null}
          {delta}
        </div>
      )}
    </Surface>
  );
}