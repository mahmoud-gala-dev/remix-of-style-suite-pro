import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useT, useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useLayout } from "@/lib/layout";
import { MODULES, MODULE_GROUPS } from "@/lib/modules";
import { ADMIN_ONLY_MODULES, type RoleKind } from "@/lib/layout";
import { useRole } from "@/lib/use-role";
import { useData } from "@/lib/store";
import { claimSuperAdmin, seedDemoData } from "@/lib/admin.functions";
import { getBookingOtpEnabled, setBookingOtpEnabled } from "@/lib/otp.functions";
import { useServerFn as useServerFn2 } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

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
  const { isAdmin } = useRole();
  const [roleTab, setRoleTab] = useState<RoleKind>("user");
  const reset = useData((s) => s.reset);
  const router = useRouter();
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const claim = useServerFn(claimSuperAdmin);
  const seed = useServerFn(seedDemoData);
  const fetchOtp = useServerFn2(getBookingOtpEnabled);
  const setOtp = useServerFn2(setBookingOtpEnabled);
  const otpQ = useQuery({ queryKey: ["booking-otp-enabled"], queryFn: () => fetchOtp() });
  const otpMut = useMutation({
    mutationFn: (enabled: boolean) => setOtp({ data: { enabled } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["booking-otp-enabled"] }); toast.success("Saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

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

      {isAdmin && (
        <Surface>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim">Public booking — OTP</h3>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-dim">{otpQ.data?.enabled ? "Required" : "Disabled"}</span>
              <input
                type="checkbox"
                checked={Boolean(otpQ.data?.enabled)}
                disabled={otpMut.isPending || otpQ.isLoading}
                onChange={(e) => otpMut.mutate(e.target.checked)}
                className="size-4 accent-primary"
              />
            </label>
          </div>
          <p className="text-xs text-dim">
            When enabled, guests must verify their phone with a 6-digit code before a booking is accepted.
          </p>
        </Surface>
      )}

      <Surface>
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim mb-4">Navigation Layout</h3>
        <details className="mb-5 rounded-md border border-border/60 bg-muted/20 p-3 group" open>
          <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-widest text-dim hover:text-foreground">
            دليل الخيارات · How these options work
          </summary>
          <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-dim" dir="rtl">
            <li>
              <b className="text-foreground">الدور (Configuring role):</b> يحدّد أيّ مجموعة إعدادات تُعدّلها الآن
              (Admin أو User). كل دور يحفظ قائمته الخاصة من العناصر المرئية وعناصر الفوتر. الموديولات الإدارية
              تبقى مخفية دائمًا عن دور User حتى لو فُعِّلت.
            </li>
            <li>
              <b className="text-foreground">Shell mode — Side menu:</b> يعرض القائمة كشريط جانبي عمودي على يمين/يسار
              الصفحة، مناسب للشاشات الواسعة وللتنقّل السريع بين عدد كبير من الموديولات.
            </li>
            <li>
              <b className="text-foreground">Shell mode — Top toolbar:</b> يُحوِّل القائمة إلى شريط علوي يشبه
              تطبيقات سطح المكتب مع قوائم منسدلة لكل مجموعة (Operations / Management / Finance)، ويوفّر مساحة
              أفقية أكبر للمحتوى.
            </li>
            <li>
              <b className="text-foreground">Visible modules:</b> اضغط على أي زر موديول لإظهاره/إخفائه من
              الشريط الجانبي أو الشريط العلوي للدور المحدّد. الأزرار الملوّنة = ظاهرة، الباهتة = مخفيّة،
              والمشطوبة = إدارية وغير متاحة لدور User.
            </li>
            <li>
              <b className="text-foreground">Footer — Visible/Hidden:</b> يفعّل أو يخفي شريط الفوتر بالكامل
              من جميع الصفحات.
            </li>
            <li>
              <b className="text-foreground">Footer items:</b> يحدّد الموديولات التي تظهر كاختصارات داخل الفوتر
              عندما يكون مفعّلًا. يتأثّر بنفس قواعد الأدوار.
            </li>
            <li className="text-[11px] opacity-80">
              جميع الإعدادات تُحفظ تلقائيًا في ملف المستخدم وتُطبَّق فورًا على القائمة والفوتر عبر الأجهزة.
            </li>
          </ul>
        </details>
        <div className="space-y-5">
          {isAdmin && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-dim mb-2">
                Configuring role
              </div>
              <div className="flex gap-2">
                {(["admin", "user"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleTab(r)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest border ${
                      roleTab === r
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-dim"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-dim">
                Admin-only modules are always hidden for the User role.
              </p>
            </div>
          )}

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
                      const adminOnly = ADMIN_ONLY_MODULES.has(m.id);
                      const forced = roleTab === "user" && adminOnly;
                      const visible = !forced && !layout.hiddenItems[roleTab].includes(m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => !forced && layout.toggleHidden(roleTab, m.id)}
                          disabled={forced || !isAdmin}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border transition-colors ${
                            visible
                              ? "bg-primary/10 border-primary/30 text-primary"
                              : "border-border text-dim opacity-60 hover:opacity-100"
                          } ${forced ? "line-through opacity-40 cursor-not-allowed" : ""} disabled:cursor-not-allowed`}
                          title={
                            forced
                              ? "Admin-only module"
                              : !isAdmin
                                ? "Admins only"
                                : visible
                                  ? "Click to hide"
                                  : "Click to show"
                          }
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
            const adminOnly = ADMIN_ONLY_MODULES.has(m.id);
            const forced = roleTab === "user" && adminOnly;
            const on = !forced && layout.footerItems[roleTab].includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => !forced && layout.toggleFooterItem(roleTab, m.id)}
                disabled={!layout.footerEnabled || forced || !isAdmin}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border transition-colors disabled:opacity-40 ${
                  on
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "border-border text-dim hover:text-foreground"
                } ${forced ? "line-through" : ""}`}
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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest border border-destructive/40 text-destructive hover:bg-destructive/10">
                Reset local
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset local store?</AlertDialogTitle>
                <AlertDialogDescription>This restores local demo state on this device only.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => { reset(); toast.success("Local store reset"); }}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        {msg && <p className="text-xs text-dim mt-3">{msg}</p>}
      </Surface>
    </div>
  );
}
