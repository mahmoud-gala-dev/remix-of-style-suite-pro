import { useEffect, type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { CommandPalette } from "@/components/command-palette";
import { PwaInstall } from "@/components/pwa-install";
import { BottomNav } from "@/components/shell/bottom-nav";

export function AppShell({ children }: { children: ReactNode }) {
  const lang = useI18n((s) => s.lang);
  const mode = useTheme((s) => s.mode);

  useEffect(() => {
    const html = document.documentElement;
    html.lang = lang;
    html.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("dark", mode === "dark");
    html.classList.toggle("light", mode === "light");
  }, [mode]);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <main className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <div className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</div>
      </main>
      <CommandPalette />
      <PwaInstall />
      <BottomNav />
    </div>
  );
}
