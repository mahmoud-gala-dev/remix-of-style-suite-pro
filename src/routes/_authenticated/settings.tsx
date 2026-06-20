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
import { ADMIN_ONLY_MODULES, type RoleKind } from "@/lib/layout";
import { useRole } from "@/lib/use-role";
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
      </Surface>

      <Surface>
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim mb-4">Navigation Layout</h3>
        <div className="space-y-5">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-dim mb-2">Shell mode</div>
            <div className="flex gap-2">
              {(["sidebar", "topbar"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => layout.setMode(m)}
                  className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest border ${
                    layout.mode === m
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-dim"
                  }`}
                >
                  {m === "sidebar" ? "Side menu" : "Top toolbar"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-dim mb-2">Visible modules</div>
            <div className="space-y-3">
              {MODULE_GROUPS.map((g) => (
                <div key={g}>
                  <div className="text-[10px] uppercase tracking-widest text-dim/70 mb-1.5">{t(g)}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {MODULES.filter((m) => m.group === g).map((m) => {
                      const visible = !layout.hiddenItems.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => layout.toggleHidden(m.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border transition-colors ${
                            visible
                              ? "bg-primary/10 border-primary/30 text-primary"
                              : "border-border text-dim opacity-60 hover:opacity-100"
                          }`}
                          title={visible ? "Click to hide" : "Click to show"}
                        >
                          <m.icon className="size-3.5" />
                          {t(m.label)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Surface>

      <Surface>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim">Footer</h3>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-dim">{layout.footerEnabled ? "Visible" : "Hidden"}</span>
            <input
              type="checkbox"
              checked={layout.footerEnabled}
              onChange={(e) => layout.setFooterEnabled(e.target.checked)}
              className="size-4 accent-primary"
            />
          </label>
        </div>
        <div className="text-[11px] uppercase tracking-wider text-dim mb-2">Footer items</div>
        <div className="flex flex-wrap gap-1.5">
          {MODULES.map((m) => {
            const on = layout.footerItems.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => layout.toggleFooterItem(m.id)}
                disabled={!layout.footerEnabled}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border transition-colors disabled:opacity-40 ${
                  on
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "border-border text-dim hover:text-foreground"
                }`}
              >
                <m.icon className="size-3.5" />
                {t(m.label)}
              </button>
            );
          })}
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
