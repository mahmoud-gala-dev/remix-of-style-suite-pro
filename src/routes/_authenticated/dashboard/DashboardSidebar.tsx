import { Clock } from "lucide-react";
import { Surface } from "@/components/shell/page";
import { useT, useI18n } from "@/lib/i18n";
import { fmtMoney, initials, minutesSince } from "@/lib/format";
import type { Employee, Service, QueueItem } from "@/types/domain";
import { AlertsWidget } from "@/components/shell/alerts-widget";

type Props = {
  queue: QueueItem[];
  topEmployees: (Employee & { revenue: number })[];
  topServices: (Service & { count: number })[];
  customerName: (id: string) => string;
};

export function DashboardSidebar({ queue, topEmployees, topServices, customerName }: Props) {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  return (
    <div className="space-y-4">
      <AlertsWidget />
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
              <div className="size-10 rounded-lg bg-surface-2 grid place-items-center text-xs font-bold">#{i + 1}</div>
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
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-4">{t("topPerforming")}</h3>
        <div className="space-y-3">
          {topEmployees.map((e) => (
            <div key={e.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-full bg-surface-2 grid place-items-center text-[10px] font-semibold">{initials(e.nameEn)}</div>
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
  );
}