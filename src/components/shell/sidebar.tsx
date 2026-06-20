import { Link, useRouterState } from "@tanstack/react-router";
import {
  CalendarDays,
  LayoutDashboard,
  ListOrdered,
  Scissors,
  Settings,
  Store,
  Users,
  UserCog,
  ClipboardList,
  BarChart3,
  Crown,
  Ticket,
  Receipt,
  Sparkles,
} from "lucide-react";
import { useT, type DictKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const groups: { label: DictKey; items: { to: string; icon: React.ComponentType<{ className?: string }>; label: DictKey }[] }[] = [
  {
    label: "operations",
    items: [
      { to: "/", icon: LayoutDashboard, label: "dashboard" },
      { to: "/calendar", icon: CalendarDays, label: "calendar" },
      { to: "/bookings", icon: ClipboardList, label: "bookings" },
      { to: "/queue", icon: ListOrdered, label: "queue" },
      { to: "/customers", icon: Users, label: "customers" },
    ],
  },
  {
    label: "management",
    items: [
      { to: "/services", icon: Scissors, label: "services" },
      { to: "/employees", icon: UserCog, label: "employees" },
      { to: "/branches", icon: Store, label: "branches" },
      { to: "/reports", icon: BarChart3, label: "reports" },
      { to: "/settings", icon: Settings, label: "settings" },
    ],
  },
  {
    label: "finance",
    items: [
      { to: "/invoices", icon: Receipt, label: "invoices" },
      { to: "/memberships", icon: Crown, label: "memberships" },
      { to: "/coupons", icon: Ticket, label: "coupons" },
      { to: "/loyalty", icon: Sparkles, label: "loyalty" },
    ],
  },
];

export function Sidebar() {
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="w-64 border-e border-border bg-sidebar flex flex-col shrink-0 sticky top-0 h-screen">
      <div className="p-6">
        <div className="font-display text-2xl uppercase tracking-tight text-primary">
          Vanguard
        </div>
        <div className="text-[10px] tracking-[0.2em] text-dim uppercase mt-1">
          Salon OS
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {groups.map((g, gi) => (
          <div key={g.label} className={gi > 0 ? "pt-5" : ""}>
            <div className="px-3 pb-2 text-[10px] font-bold text-dim/60 uppercase tracking-[0.2em]">
              {t(g.label)}
            </div>
            {g.items.map(({ to, icon: Icon, label }) => {
              const active = pathname === to || (to !== "/" && pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-dim hover:text-foreground hover:bg-surface-2/50",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="font-medium">{t(label)}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-surface-2 grid place-items-center text-xs font-semibold ring-1 ring-white/5">
            MK
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">Marcus K.</div>
            <div className="text-[10px] text-dim">{t("admin")}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
