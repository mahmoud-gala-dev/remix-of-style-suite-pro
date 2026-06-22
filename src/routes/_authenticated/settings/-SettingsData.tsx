import { useState, useRef } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Surface } from "@/components/shell/page";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { claimSuperAdmin, seedDemoData } from "@/lib/admin.functions";
import { exportTenantData } from "@/lib/export-tenant.functions";
import { restoreTenantFromCsv } from "@/lib/restore.functions";
import { getAppSettings, setAppSetting } from "@/lib/settings.functions";
import { useRole } from "@/lib/use-role";
import { useData } from "@/lib/store";
import { useT } from "@/lib/i18n";

export function SettingsData() {
  const t = useT();
  const reset = useData((s) => s.reset);
  const router = useRouter();
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const claim = useServerFn(claimSuperAdmin);
  const seed = useServerFn(seedDemoData);
  const exportFn = useServerFn(exportTenantData);
  const restoreFn = useServerFn(restoreTenantFromCsv);
  const currentTenantId = useData((s) => s.currentTenantId);
  const { isAdmin } = useRole();
  const fetchSettings = useServerFn(getAppSettings);
  const saveSetting = useServerFn(setAppSetting);
  const settingsQ = useQuery({ queryKey: ["app-settings"], queryFn: () => fetchSettings() });
  const geoMut = useMutation({
    mutationFn: (enabled: boolean) => saveSetting({ data: { key: "geo_backup_enabled", value: enabled } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["app-settings"] }); toast.success(t("saved")); },
    onError: (e: Error) => toast.error(e.message),
  });
  const claimMut = useMutation({
    mutationFn: () => claim(),
    onSuccess: (r) => setMsg(r.ok ? (r.alreadyOwner ? t("alreadySuperAdmin") : t("superAdminGranted")) : t("alreadyClaimedByOther")),
    onError: (e: Error) => setMsg(e.message),
  });
  const seedMut = useMutation({
    mutationFn: () => seed(),
    onSuccess: async (r) => {
      setMsg(r.skipped ? t("branchesExistSkipped") : t("demoDataLoaded"));
      await qc.invalidateQueries({ queryKey: ["hydrate"] });
      router.invalidate();
    },
    onError: (e: Error) => setMsg(e.message),
  });
  const exportMut = useMutation({
    mutationFn: async () => {
      if (!currentTenantId) throw new Error(t("noTenantSelected"));
      return exportFn({ data: { tenantId: currentTenantId } });
    },
    onSuccess: (r) => {
      const blob = new Blob([`\uFEFF${r.bundle}`], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = r.filename; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(t("tenantDataExported"));
    },
    onError: (e: Error) => setMsg(e.message),
  });
  const restoreMut = useMutation({
    mutationFn: async (bundle: string) => {
      if (!currentTenantId) throw new Error(t("noTenantSelected"));
      return restoreFn({ data: { tenantId: currentTenantId, bundle } });
    },
    onSuccess: (r) => {
      toast.success(`Restored ${r.inserted} rows, skipped ${r.skipped}`);
      qc.invalidateQueries({ queryKey: ["hydrate"] });
      router.invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      if (!text.includes("# ")) {
        toast.error("Invalid export bundle format. Use a file exported from this app.");
        return;
      }
      restoreMut.mutate(text);
    };
    reader.readAsText(file);
  };

  return (
    <>
    <Surface>
      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim mb-4">{t("data")}</h3>
      <p className="text-xs text-dim mb-3">{t("dataIntro")}</p>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => claimMut.mutate()} disabled={claimMut.isPending} className="px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest border border-primary/40 text-primary hover:bg-primary/10 disabled:opacity-50">
          {claimMut.isPending ? "…" : t("claimSuperAdmin")}
        </button>
        <button onClick={() => seedMut.mutate()} disabled={seedMut.isPending} className="px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest border border-primary/40 text-primary hover:bg-primary/10 disabled:opacity-50">
          {seedMut.isPending ? "…" : t("loadDemoData")}
        </button>
        <button
          onClick={() => exportMut.mutate()}
          disabled={exportMut.isPending || !currentTenantId}
          className="px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest border border-primary/40 text-primary hover:bg-primary/10 disabled:opacity-50"
          title={t("exportTenantDataTooltip")}
        >
          {exportMut.isPending ? "…" : t("exportTenantData")}
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={restoreMut.isPending || !currentTenantId}
          className="px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest border border-primary/40 text-primary hover:bg-primary/10 disabled:opacity-50"
        >
          {restoreMut.isPending ? "…" : t("restoreFromCsv")}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest border border-destructive/40 text-destructive hover:bg-destructive/10">{t("resetLocal")}</button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("resetLocalConfirm")}</AlertDialogTitle>
              <AlertDialogDescription>{t("resetLocalDescription")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { reset(); toast.success(t("localStoreReset")); }}>{t("reset")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {msg && <p className="text-xs text-dim mt-3">{msg}</p>}
    </Surface>
    {isAdmin && (
      <Surface>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim">Geo-Backup (Off-region)</h3>
            <p className="text-xs text-dim mt-1">
              نسخ احتياطي يومي لجميع الجداول الأساسية إلى S3 خارج المنطقة. معطّل افتراضياً —
              فعّله بعد إضافة مفاتيح <code>BACKUP_S3_REGION</code>،{" "}
              <code>BACKUP_S3_BUCKET</code>، <code>BACKUP_S3_ACCESS_KEY_ID</code>،{" "}
              <code>BACKUP_S3_SECRET_ACCESS_KEY</code> ثم جدوله عبر pg_cron يومياً 03:00.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-dim">{settingsQ.data?.geo_backup_enabled ? t("active") : t("disabled")}</span>
            <input
              type="checkbox"
              checked={Boolean(settingsQ.data?.geo_backup_enabled)}
              disabled={geoMut.isPending || settingsQ.isLoading}
              onChange={(e) => geoMut.mutate(e.target.checked)}
              className="size-4 accent-primary"
            />
          </label>
        </div>
      </Surface>
    )}
    </>
  );
}
