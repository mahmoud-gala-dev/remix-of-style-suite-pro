import { useState } from "react";
import { Surface } from "@/components/shell/page";
import { useT } from "@/lib/i18n";
import { useLayout, ADMIN_ONLY_MODULES, type RoleKind } from "@/lib/layout";
import { MODULES, MODULE_GROUPS } from "@/lib/modules";
import { useRole } from "@/lib/use-role";

export function SettingsLayout() {
  const t = useT();
  const layout = useLayout();
  const { isAdmin } = useRole();
  const [roleTab, setRoleTab] = useState<RoleKind>("user");

  return (
    <>
      <Surface>
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim mb-4">{t("navigationLayout")}</h3>
        <div className="space-y-5">
          {isAdmin && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-dim mb-2">{t("configuringRole")}</div>
              <div className="flex gap-2">
                {(["admin", "user"] as const).map((r) => (
                  <button key={r} onClick={() => setRoleTab(r)} className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest border ${roleTab === r ? "bg-primary text-primary-foreground border-primary" : "border-border text-dim"}`}>{r}</button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-dim">{t("adminOnlyHidden")}</p>
            </div>
          )}

          <div>
            <div className="text-[11px] uppercase tracking-wider text-dim mb-2">{t("shellMode")}</div>
            <div className="flex gap-2">
              {(["sidebar", "topbar"] as const).map((m) => (
                <button key={m} onClick={() => layout.setMode(m)} className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest border ${layout.mode === m ? "bg-primary text-primary-foreground border-primary" : "border-border text-dim"}`}>
                  {m === "sidebar" ? t("sideMenu") : t("topToolbar")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-dim mb-2">{t("visibleModules")}</div>
            <div className="space-y-3">
              {MODULE_GROUPS.map((g) => (
                <div key={g}>
                  <div className="text-[10px] uppercase tracking-widest text-dim/70 mb-1.5">{t(g)}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {MODULES.filter((m) => m.group === g).map((m) => {
                      const adminOnly = ADMIN_ONLY_MODULES.has(m.id);
                      const forced = roleTab === "user" && adminOnly;
                      const visible = !forced && !layout.hiddenItems[roleTab].includes(m.id);
                      return (
                        <button key={m.id} onClick={() => !forced && layout.toggleHidden(roleTab, m.id)} disabled={forced || !isAdmin} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border transition-colors ${visible ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-dim opacity-60 hover:opacity-100"} ${forced ? "line-through opacity-40 cursor-not-allowed" : ""} disabled:cursor-not-allowed`}>
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
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim">{t("footer")}</h3>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-dim">{layout.footerEnabled ? t("visible") : t("hidden")}</span>
            <input type="checkbox" checked={layout.footerEnabled} onChange={(e) => layout.setFooterEnabled(e.target.checked)} className="size-4 accent-primary" />
          </label>
        </div>
        <div className="text-[11px] uppercase tracking-wider text-dim mb-2">{t("footerItems")}</div>
        <div className="flex flex-wrap gap-1.5">
          {MODULES.map((m) => {
            const adminOnly = ADMIN_ONLY_MODULES.has(m.id);
            const forced = roleTab === "user" && adminOnly;
            const on = !forced && layout.footerItems[roleTab].includes(m.id);
            return (
              <button key={m.id} onClick={() => !forced && layout.toggleFooterItem(roleTab, m.id)} disabled={!layout.footerEnabled || forced || !isAdmin} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border transition-colors disabled:opacity-40 ${on ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-dim hover:text-foreground"} ${forced ? "line-through" : ""}`}>
                <m.icon className="size-3.5" />
                {t(m.label)}
              </button>
            );
          })}
        </div>
      </Surface>
    </>
  );
}