import { useEffect, type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { TopNav } from "./top-nav";
import { Footer } from "./footer";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useLayout } from "@/lib/layout";
import { CommandPalette } from "@/components/command-palette";
import { PwaInstall } from "@/components/pwa-install";
import { BottomNav } from "@/components/shell/bottom-nav";

export function AppShell({ children }: { children: ReactNode }) {
  const lang = useI18n((s) => s.lang);
  const mode = useTheme((s) => s.mode);
  const shellMode = useLayout((s) => s.mode);

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

  if (shellMode === "topbar") {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <TopNav />
        <Topbar />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
        <Footer />
        <CommandPalette />
        <PwaInstall />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <main className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <div className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</div>
        <Footer />
      </main>
      <CommandPalette />
      <PwaInstall />
      <BottomNav />
    </div>
  );
}
