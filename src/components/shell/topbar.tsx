import { Bell, ChevronDown, LogOut, Monitor, Moon, Search, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useI18n, useT } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useData, useCurrentBranch } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { listTenants } from "@/lib/tenants.functions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function Topbar() {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const setLang = useI18n((s) => s.setLang);
  const themeMode = useTheme((s) => s.mode);
  const toggleTheme = useTheme((s) => s.toggle);
  const branch = useCurrentBranch();
  const allBranches = useData((s) => s.branches);
  const setCurrentBranch = useData((s) => s.setCurrentBranch);
  const currentTenantId = useData((s) => s.currentTenantId);
  const setCurrentTenant = useData((s) => s.setCurrentTenant);
  const fetchTenants = useServerFn(listTenants);
  const tenantsQ = useQuery({ queryKey: ["tenants"], queryFn: () => fetchTenants(), staleTime: 60_000 });
  const branches = currentTenantId
    ? allBranches.filter((b) => b.tenantId === currentTenantId)
    : allBranches;
  const [now, setNow] = useState<string>("");
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" }));
    tick();
    const i = setInterval(tick, 60_000);
    return () => clearInterval(i);
  }, []);

  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-background/70 backdrop-blur-md sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {(tenantsQ.data?.length ?? 0) > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 bg-surface border border-border px-3 py-1.5 rounded-md hover:bg-surface-2 transition-colors">
              <span className="text-xs text-dim">{t("tenant")}:</span>
              <span className="text-xs font-medium text-primary">
                {tenantsQ.data?.find((x) => x.id === currentTenantId)?.name ?? t("allTenants")}
              </span>
              <ChevronDown className="size-3 text-dim" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-56">
              <DropdownMenuItem
                onSelect={() => setCurrentTenant(null)}
                className={cn("flex items-center justify-between", !currentTenantId && "text-primary")}
              >
                <span>{t("allTenants")}</span>
              </DropdownMenuItem>
              {tenantsQ.data?.map((tn) => (
                <DropdownMenuItem
                  key={tn.id}
                  onSelect={() => setCurrentTenant(tn.id)}
                  className={cn("flex items-center justify-between", tn.id === currentTenantId && "text-primary")}
                >
                  <span>{tn.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 bg-surface border border-border px-3 py-1.5 rounded-md hover:bg-surface-2 transition-colors">
            <span className="text-xs text-dim">{t("branch")}:</span>
            <span className="text-xs font-medium text-primary">
              {lang === "ar" ? branch.nameAr : branch.nameEn}
            </span>
            <ChevronDown className="size-3 text-dim" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-56">
            {branches.map((b) => (
              <DropdownMenuItem
                key={b.id}
                onSelect={() => setCurrentBranch(b.id)}
                className={cn("flex items-center justify-between", b.id === branch.id && "text-primary")}
              >
                <span>{lang === "ar" ? b.nameAr : b.nameEn}</span>
                <span className="text-[10px] text-dim">{b.chairs} ch</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative hidden md:flex items-center">
          <Search className="size-3.5 absolute start-3 text-dim" />
          <input
            placeholder={t("search") + "…"}
            readOnly
            aria-label={t("search")}
            onFocus={(e) => {
              e.currentTarget.blur();
              window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
            }}
            onClick={() =>
              window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))
            }
            className="bg-surface border border-border rounded-md ps-8 pe-3 py-1.5 text-xs w-72 outline-none focus:border-primary/50 transition-colors cursor-pointer"
          />
          <kbd className="absolute end-2 text-[9px] font-mono text-dim border border-border rounded px-1 py-0.5">⌘K</kbd>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden lg:block text-[10px] font-mono text-dim">{now}</span>

        <div role="group" aria-label="Language" className="flex bg-surface rounded-md border border-border p-0.5">
          <button
            onClick={() => setLang("en")}
            aria-pressed={lang === "en"}
            aria-label="English"
            className={cn(
              "px-2.5 py-1 text-[10px] font-bold rounded-sm transition-colors",
              lang === "en" ? "bg-surface-2 text-foreground" : "text-dim",
            )}
          >
            EN
          </button>
          <button
            onClick={() => setLang("ar")}
            aria-pressed={lang === "ar"}
            aria-label="العربية"
            className={cn(
              "px-2.5 py-1 text-[10px] font-bold rounded-sm transition-colors",
              lang === "ar" ? "bg-surface-2 text-foreground" : "text-dim",
            )}
          >
            AR
          </button>
        </div>

        <button
          onClick={toggleTheme}
          className="size-8 grid place-items-center border border-border rounded-full text-dim hover:text-foreground transition-colors"
          aria-label={`Theme: ${themeMode}`}
          title={`Theme: ${themeMode}`}
        >
          {themeMode === "dark" ? <Moon className="size-3.5" /> : themeMode === "light" ? <Sun className="size-3.5" /> : <Monitor className="size-3.5" />}
        </button>

        <button
          aria-label="Notifications"
          title="Notifications"
          className="size-8 grid place-items-center border border-border rounded-full text-dim hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Bell className="size-3.5" />
        </button>

        <button
          onClick={handleSignOut}
          className="size-8 grid place-items-center border border-border rounded-full text-dim hover:text-foreground transition-colors"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="size-3.5" />
        </button>
      </div>
    </header>
  );
}
