import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, LayoutDashboard, ListOrdered, Users, ClipboardList } from "lucide-react";
import { useT, type DictKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const items: { to: string; icon: React.ComponentType<{ className?: string }>; label: DictKey }[] = [
  { to: "/", icon: LayoutDashboard, label: "dashboard" },
  { to: "/calendar", icon: CalendarDays, label: "calendar" },
  { to: "/bookings", icon: ClipboardList, label: "bookings" },
  { to: "/queue", icon: ListOrdered, label: "queue" },
  { to: "/customers", icon: Users, label: "customers" },
];

export function BottomNav() {
  const t = useT();
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const active = it.to === "/" ? path === "/" : path.startsWith(it.to);
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                <span className="truncate">{t(it.label)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}