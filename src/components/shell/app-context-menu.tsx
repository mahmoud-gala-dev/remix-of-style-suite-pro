import { type ReactNode } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { MODULES, MODULE_GROUPS } from "@/lib/modules";
import { useT, useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useLayout, ADMIN_ONLY_MODULES } from "@/lib/layout";
import { useRole } from "@/lib/use-role";
import {
  ArrowLeft,
  ArrowRight,
  Command,
  Languages,
  Moon,
  RotateCw,
  Sun,
} from "lucide-react";

export function AppContextMenu({ children }: { children: ReactNode }) {
  const t = useT();
  const navigate = useNavigate();
  const router = useRouter();
  const lang = useI18n((s) => s.lang);
  const setLang = useI18n((s) => s.setLang);
  const themeToggle = useTheme((s) => s.toggle);
  const themeMode = useTheme((s) => s.mode);
  const shellMode = useLayout((s) => s.mode);
  const setShellMode = useLayout((s) => s.setMode);
  const { role, isAdmin } = useRole();
  const hidden = useLayout((s) => s.hiddenItems[role]);

  const visible = MODULES.filter(
    (m) => !hidden.includes(m.id) && (isAdmin || !ADMIN_ONLY_MODULES.has(m.id)),
  );

  const openPalette = () => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true, bubbles: true }),
    );
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="contents">{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuLabel>{t("navigation")}</ContextMenuLabel>
        <ContextMenuItem onSelect={() => router.history.back()}>
          {lang === "ar" ? <ArrowRight className="size-4 me-2" /> : <ArrowLeft className="size-4 me-2" />}
          {t("back")}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => router.history.forward()}>
          {lang === "ar" ? <ArrowLeft className="size-4 me-2" /> : <ArrowRight className="size-4 me-2" />}
          {t("forward")}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => router.invalidate()}>
          <RotateCw className="size-4 me-2" />
          {t("refresh")}
        </ContextMenuItem>
        <ContextMenuItem onSelect={openPalette}>
          <Command className="size-4 me-2" />
          {t("commandPalette")}
          <ContextMenuShortcut>⌘K</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {MODULE_GROUPS.map((g) => {
          const items = visible.filter((m) => m.group === g);
          if (!items.length) return null;
          return (
            <ContextMenuSub key={g}>
              <ContextMenuSubTrigger>{t(g)}</ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-56">
                {items.map((m) => (
                  <ContextMenuItem
                    key={m.id}
                    onSelect={() => navigate({ to: m.to })}
                  >
                    <m.icon className="size-4 me-2" />
                    {t(m.label)}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          );
        })}

        <ContextMenuSeparator />

        <ContextMenuItem onSelect={themeToggle}>
          {themeMode === "dark" ? <Sun className="size-4 me-2" /> : <Moon className="size-4 me-2" />}
          {t("toggleTheme")}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => setLang(lang === "ar" ? "en" : "ar")}>
          <Languages className="size-4 me-2" />
          {lang === "ar" ? "English" : "العربية"}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => setShellMode(shellMode === "sidebar" ? "topbar" : "sidebar")}>
          {shellMode === "sidebar" ? t("topToolbar") : t("sideMenu")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
