import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Surface } from "@/components/shell/page";
import { useT, useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useRole } from "@/lib/use-role";
import { getBookingOtpEnabled, setBookingOtpEnabled } from "@/lib/otp.functions";
import { getAppSettings, setAppSetting } from "@/lib/settings.functions";

export function SettingsGeneral() {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const setLang = useI18n((s) => s.setLang);
  const themeMode = useTheme((s) => s.mode);
  const setTheme = useTheme((s) => s.set);
  const { isAdmin } = useRole();
  const qc = useQueryClient();
  const fetchOtp = useServerFn(getBookingOtpEnabled);
  const setOtp = useServerFn(setBookingOtpEnabled);
  const otpQ = useQuery({ queryKey: ["booking-otp-enabled"], queryFn: () => fetchOtp() });
  const fetchSettings = useServerFn(getAppSettings);
  const saveSetting = useServerFn(setAppSetting);
  const settingsQ = useQuery({ queryKey: ["app-settings"], queryFn: () => fetchSettings() });
  const settingMut = useMutation({
    mutationFn: (v: {
      key:
        | "default_tax_pct"
        | "refresh_interval"
        | "deposits_enabled"
        | "deposit_type"
        | "deposit_amount"
        | "whatsapp_reminders_enabled"
        | "whatsapp_api_enabled";
      value: number | boolean | string;
    }) => saveSetting({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["app-settings"] }); toast.success(t("save")); },
    onError: (e: Error) => toast.error(e.message),
  });
  const otpMut = useMutation({
    mutationFn: (enabled: boolean) => setOtp({ data: { enabled } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["booking-otp-enabled"] }); toast.success(t("saved")); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <Surface>
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim mb-4">{t("language")}</h3>
        <div className="flex gap-2">
          {(["en", "ar"] as const).map((l) => (
            <button key={l} onClick={() => setLang(l)} className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest border ${lang === l ? "bg-primary text-primary-foreground border-primary" : "border-border text-dim"}`}>
              {l === "en" ? "English" : "العربية"}
            </button>
          ))}
        </div>
      </Surface>

      <Surface>
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim mb-4">{t("theme")}</h3>
        <div className="flex gap-2">
          {(["dark", "light"] as const).map((m) => (
            <button key={m} onClick={() => setTheme(m)} className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest border ${themeMode === m ? "bg-primary text-primary-foreground border-primary" : "border-border text-dim"}`}>
              {t(m)}
            </button>
          ))}
        </div>
      </Surface>

      {isAdmin && (
        <Surface>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim">{t("bookingOtpRequired")}</h3>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-dim">{otpQ.data?.enabled ? t("active") : t("disabled")}</span>
              <input type="checkbox" checked={Boolean(otpQ.data?.enabled)} disabled={otpMut.isPending || otpQ.isLoading} onChange={(e) => otpMut.mutate(e.target.checked)} className="size-4 accent-primary" />
            </label>
          </div>
          <p className="text-xs text-dim">{t("otpHelp")}</p>
        </Surface>
      )}

      {isAdmin && (
        <Surface>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim mb-4">{t("generalSettings")}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs">
              <span className="text-dim">{t("defaultTaxPct")}</span>
              <input type="number" min={0} max={100} step={0.5} defaultValue={Number(settingsQ.data?.default_tax_pct ?? 0)} onBlur={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v)) settingMut.mutate({ key: "default_tax_pct", value: v }); }} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
            </label>
            <label className="space-y-1.5 text-xs">
              <span className="text-dim">{t("refreshInterval")}</span>
              <input type="number" min={5} max={600} step={5} defaultValue={Number(settingsQ.data?.refresh_interval ?? 30)} onBlur={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v)) settingMut.mutate({ key: "refresh_interval", value: v }); }} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
            </label>
          </div>
          <p className="text-xs text-dim mt-3">{t("valuesSaveOnBlur")}</p>
        </Surface>
      )}

      {isAdmin && (
        <Surface>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim">Online Deposits (Stripe)</h3>
              <p className="text-xs text-dim mt-1">عربون عبر Stripe — معطّل افتراضياً. فعّله بعد إضافة مفاتيح Stripe.</p>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-dim">{settingsQ.data?.deposits_enabled ? t("active") : t("disabled")}</span>
              <input
                type="checkbox"
                checked={Boolean(settingsQ.data?.deposits_enabled)}
                disabled={settingMut.isPending || settingsQ.isLoading}
                onChange={(e) => settingMut.mutate({ key: "deposits_enabled", value: e.target.checked })}
                className="size-4 accent-primary"
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs">
              <span className="text-dim">Deposit Type</span>
              <select
                defaultValue={settingsQ.data?.deposit_type ?? "percent"}
                disabled={!settingsQ.data?.deposits_enabled}
                onChange={(e) => settingMut.mutate({ key: "deposit_type", value: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm disabled:opacity-50"
              >
                <option value="percent">% of service</option>
                <option value="fixed">Fixed amount</option>
              </select>
            </label>
            <label className="space-y-1.5 text-xs">
              <span className="text-dim">Deposit Amount</span>
              <input
                type="number"
                min={0}
                step={1}
                defaultValue={Number(settingsQ.data?.deposit_amount ?? 20)}
                disabled={!settingsQ.data?.deposits_enabled}
                onBlur={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v)) settingMut.mutate({ key: "deposit_amount", value: v }); }}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm disabled:opacity-50"
              />
            </label>
          </div>
        </Surface>
      )}
    </>
  );
}