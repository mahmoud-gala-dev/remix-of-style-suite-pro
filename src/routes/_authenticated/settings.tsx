import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { useT, useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useLayout } from "@/lib/layout";
import { MODULES, MODULE_GROUPS } from "@/lib/modules";
import { useData } from "@/lib/store";
import { claimSuperAdmin, seedDemoData } from "@/lib/admin.functions";

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
  const layout = useLayout();
  const reset = useData((s) => s.reset);
  const router = useRouter();
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const claim = useServerFn(claimSuperAdmin);
  const seed = useServerFn(seedDemoData);

  const claimMut = useMutation({
    mutationFn: () => claim(),
    onSuccess: (r) => {
      setMsg(r.ok ? (r.alreadyOwner ? "You are already super-admin." : "Super-admin granted.") : "Already claimed by another user.");
    },
    onError: (e: Error) => setMsg(e.message),
  });
  const seedMut = useMutation({
    mutationFn: () => seed(),
    onSuccess: async (r) => {
      setMsg(r.skipped ? "Branches already exist — skipped." : "Demo data loaded.");
      await qc.invalidateQueries({ queryKey: ["hydrate"] });
      router.invalidate();
    },
    onError: (e: Error) => setMsg(e.message),
  });

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
          First-time setup: claim super-admin, then load demo data into Lovable Cloud.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => claimMut.mutate()}
            disabled={claimMut.isPending}
            className="px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest border border-primary/40 text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            {claimMut.isPending ? "…" : "Claim super-admin"}
          </button>
          <button
            onClick={() => seedMut.mutate()}
            disabled={seedMut.isPending}
            className="px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest border border-primary/40 text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            {seedMut.isPending ? "…" : "Load demo data"}
          </button>
          <button
            onClick={() => {
              if (confirm("Reset local store to seed?")) reset();
            }}
            className="px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest border border-destructive/40 text-destructive hover:bg-destructive/10"
          >
            Reset local
          </button>
        </div>
        {msg && <p className="text-xs text-dim mt-3">{msg}</p>}
      </Surface>
    </div>
  );
}
