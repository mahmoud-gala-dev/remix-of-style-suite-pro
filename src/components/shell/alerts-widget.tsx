import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bell, ShieldAlert } from "lucide-react";
import { Surface } from "@/components/shell/page";
import { getAlerts } from "@/lib/alerts.functions";

export function AlertsWidget() {
  const fetchAlerts = useServerFn(getAlerts);
  const q = useQuery({ queryKey: ["alerts"], queryFn: () => fetchAlerts(), refetchInterval: 60_000 });
  const alerts = q.data ?? [];
  if (q.isLoading || alerts.length === 0) {
    return (
      <Surface>
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim mb-3">Alerts</h3>
        <p className="text-xs text-dim">{q.isLoading ? "Loading…" : "All clear"}</p>
      </Surface>
    );
  }
  return (
    <Surface>
      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim mb-3 flex items-center gap-2">
        <Bell className="size-3" /> Alerts ({alerts.length})
      </h3>
      <ul className="space-y-2">
        {alerts.map((a) => {
          const Icon = a.severity === "error" ? ShieldAlert : AlertTriangle;
          const color = a.severity === "error" ? "text-destructive" : "text-amber-500";
          return (
            <li key={a.id} className="flex items-start gap-2 text-xs">
              <Icon className={`size-3.5 mt-0.5 ${color}`} />
              <div>
                <div className="font-medium">{a.title}</div>
                <div className="text-dim">{a.detail}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </Surface>
  );
}