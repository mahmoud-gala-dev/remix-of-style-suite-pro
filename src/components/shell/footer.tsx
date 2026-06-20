import { Link, useRouterState } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { MODULES } from "@/lib/modules";
import { useLayout } from "@/lib/layout";

export function Footer() {
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const enabled = useLayout((s) => s.footerEnabled);
  const ids = useLayout((s) => s.footerItems);
  if (!enabled) return null;
  const items = ids
    .map((id) => MODULES.find((m) => m.id === id))
    .filter((m): m is (typeof MODULES)[number] => Boolean(m));
  if (items.length === 0) return null;

  return (
    <footer className="border-t border-border bg-background/95 backdrop-blur">
      <div className="px-6 py-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="text-[10px] tracking-[0.2em] text-dim uppercase">
          Vanguard · {new Date().getFullYear()}
        </div>
        <nav className="flex flex-wrap items-center gap-1 ms-auto">
          {items.map(({ to, icon: Icon, label }) => {
            const active = pathname === to || (to !== "/" && pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-dim hover:text-foreground hover:bg-surface-2/50",
                )}
              >
                <Icon className="size-3.5" />
                <span className="font-medium">{t(label)}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </footer>
  );
}