import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { MODULES, MODULE_GROUPS } from "@/lib/modules";
import { useLayout, ADMIN_ONLY_MODULES } from "@/lib/layout";
import { useRole } from "@/lib/use-role";

export function TopNav() {
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { role, isAdmin } = useRole();
  const hidden = useLayout((s) => s.hiddenItems[role]);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex items-center gap-2 px-4 h-14">
        <div className="flex items-center gap-2 me-4">
          <div className="font-display text-xl uppercase tracking-tight text-primary">Vanguard</div>
          <span className="text-[9px] tracking-[0.2em] text-dim uppercase">Salon OS</span>
        </div>
        <nav className="hidden md:flex items-center gap-1">
          {MODULE_GROUPS.map((groupKey) => {
            const items = MODULES.filter(
              (m) =>
                m.group === groupKey &&
                !hidden.includes(m.id) &&
                (isAdmin || !ADMIN_ONLY_MODULES.has(m.id)),
            );
            if (items.length === 0) return null;
            const isActiveGroup = items.some(
              (i) => pathname === i.to || (i.to !== "/" && pathname.startsWith(i.to)),
            );
            return (
              <DropdownMenu key={groupKey}>
                <DropdownMenuTrigger
                  className={cn(
                    "inline-flex items-center gap-1 px-3 h-9 rounded-md text-sm font-medium transition-colors outline-none",
                    isActiveGroup
                      ? "bg-primary/10 text-primary"
                      : "text-dim hover:text-foreground hover:bg-surface-2/50",
                  )}
                >
                  {t(groupKey)}
                  <ChevronDown className="size-3.5 opacity-60" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-48">
                  {items.map(({ to, icon: Icon, label }) => {
                    const active =
                      pathname === to || (to !== "/" && pathname.startsWith(to));
                    return (
                      <DropdownMenuItem key={to} asChild>
                        <Link
                          to={to}
                          className={cn(
                            "flex items-center gap-2 text-sm cursor-pointer",
                            active && "bg-primary/10 text-primary",
                          )}
                        >
                          <Icon className="size-4 shrink-0" />
                          <span>{t(label)}</span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </nav>
      </div>
    </header>
  );
}