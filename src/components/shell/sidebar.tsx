import { Link, useRouterState } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { MODULES, MODULE_GROUPS } from "@/lib/modules";
import { useLayout } from "@/lib/layout";

export function Sidebar() {
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hidden = useLayout((s) => s.hiddenItems);
  const groups = MODULE_GROUPS.map((label) => ({
    label,
    items: MODULES.filter((m) => m.group === label && !hidden.includes(m.id)),
  })).filter((g) => g.items.length > 0);

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
