import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Surface } from "@/components/shell/page";
import { useT } from "@/lib/i18n";
import { enroll2FA, verify2FA, disable2FA, get2FAStatus } from "@/lib/2fa.functions";

export function Settings2FA() {
  const t = useT();
  const qc = useQueryClient();
  const fetchStatus = useServerFn(get2FAStatus);
  const enroll = useServerFn(enroll2FA);
  const verify = useServerFn(verify2FA);
  const disable = useServerFn(disable2FA);

  const statusQ = useQuery({ queryKey: ["2fa-status"], queryFn: () => fetchStatus() });
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const enrollMut = useMutation({
    mutationFn: () => enroll(),
    onSuccess: (r) => setQr(r.qr),
    onError: (e: Error) => toast.error(e.message),
  });
  const verifyMut = useMutation({
    mutationFn: () => verify({ data: { code } }),
    onSuccess: () => { setQr(null); setCode(""); qc.invalidateQueries({ queryKey: ["2fa-status"] }); toast.success(t("twoFAEnabled")); },
    onError: () => toast.error(t("twoFAInvalidCode")),
  });
  const disableMut = useMutation({
    mutationFn: () => disable({ data: { code } }),
    onSuccess: () => { setCode(""); qc.invalidateQueries({ queryKey: ["2fa-status"] }); toast.success(t("twoFADisabled")); },
    onError: () => toast.error(t("twoFAInvalidCode")),
  });

  const enabled = !!statusQ.data?.enabled;

  return (
    <Surface>
      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim mb-4">{t("twoFactorAuth")}</h3>
      <p className="text-xs text-dim mb-4">{t("twoFADescription")}</p>

      {enabled ? (
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-500 text-xs font-bold uppercase tracking-widest">{t("twoFAEnabled")}</div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-[11px] uppercase tracking-wider text-dim mb-1.5 block">{t("twoFACurrentCode")}</label>
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" maxLength={6} placeholder="000000" className="w-full px-3 py-2 rounded-md border border-border bg-transparent text-sm tabular-nums tracking-widest" />
            </div>
            <button onClick={() => disableMut.mutate()} disabled={code.length !== 6 || disableMut.isPending} className="px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest border border-destructive text-destructive disabled:opacity-40">
              {t("disable")}
            </button>
          </div>
        </div>
      ) : qr ? (
        <div className="space-y-3">
          <p className="text-xs text-dim">{t("twoFAScanQR")}</p>
          <img src={qr} alt="2FA QR" className="size-44 rounded-md border border-border bg-white p-2" />
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-[11px] uppercase tracking-wider text-dim mb-1.5 block">{t("twoFAEnterCode")}</label>
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" maxLength={6} placeholder="000000" className="w-full px-3 py-2 rounded-md border border-border bg-transparent text-sm tabular-nums tracking-widest" />
            </div>
            <button onClick={() => verifyMut.mutate()} disabled={code.length !== 6 || verifyMut.isPending} className="px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest bg-primary text-primary-foreground disabled:opacity-40">
              {t("twoFAVerify")}
            </button>
            <button onClick={() => { setQr(null); setCode(""); }} className="px-3 py-2 rounded-md text-xs font-bold uppercase tracking-widest border border-border text-dim">{t("cancel")}</button>
          </div>
        </div>
      ) : (
        <button onClick={() => enrollMut.mutate()} disabled={enrollMut.isPending || statusQ.isLoading} className="px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest bg-primary text-primary-foreground disabled:opacity-40">
          {t("twoFAEnable")}
        </button>
      )}
    </Surface>
  );
}