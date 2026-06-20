import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/types/domain";
import { useT } from "@/lib/i18n";

const STYLES: Record<BookingStatus | "called", string> = {
  pending: "bg-surface-2 text-dim ring-border",
  confirmed: "bg-primary/10 text-primary ring-primary/20",
  arrived: "bg-chart-3/10 text-chart-3 ring-chart-3/20",
  waiting: "bg-chart-3/10 text-chart-3 ring-chart-3/20",
  inProgress: "bg-primary text-primary-foreground ring-primary",
  completed: "bg-success/10 text-success ring-success/20",
  cancelled: "bg-destructive/10 text-destructive ring-destructive/20",
  noShow: "bg-destructive/10 text-destructive ring-destructive/20",
  called: "bg-chart-3/10 text-chart-3 ring-chart-3/20",
};

export function StatusPill({ status }: { status: BookingStatus | "called" }) {
  const t = useT();
  const labelKey = status as Parameters<typeof t>[0];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-sm ring-1",
        STYLES[status],
      )}
    >
      {t(labelKey, status)}
    </span>
  );
}
