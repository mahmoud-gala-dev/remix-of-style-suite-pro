import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { useT, useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useData } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/settings")({
  ssr: false,
  head: () => ({ meta: [{ title: "Settings" }] }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});

function Page() {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const setLang = useI18n((s) => s.setLang);
  const themeMode = useTheme((s) => s.mode);
  const setTheme = useTheme((s) => s.set);
  const reset = useData((s) => s.reset);

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <PageHeader title={t("settings")} subtitle="Configure preferences and data." />

      <Surface>
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim mb-4">{t("language")}</h3>
        <div className="flex gap-2">
          {(["en", "ar"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest border ${
                lang === l ? "bg-primary text-primary-foreground border-primary" : "border-border text-dim"
              }`}
            >
              {l === "en" ? "English" : "العربية"}
            </button>
          ))}
        </div>
      </Surface>

      <Surface>
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim mb-4">{t("theme")}</h3>
        <div className="flex gap-2">
          {(["dark", "light"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setTheme(m)}
              className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest border ${
                themeMode === m ? "bg-primary text-primary-foreground border-primary" : "border-border text-dim"
              }`}
            >
              {t(m)}
            </button>
          ))}
        </div>
      </Surface>

      <Surface>
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim mb-4">Data</h3>
        <p className="text-xs text-dim mb-3">
          All data is stored locally in your browser. Reset to seed sample data.
        </p>
        <button
          onClick={() => {
            if (confirm("Reset all data to defaults?")) reset();
          }}
          className="px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest border border-destructive/40 text-destructive hover:bg-destructive/10"
        >
          Reset data
        </button>
      </Surface>
    </div>
  );
}
