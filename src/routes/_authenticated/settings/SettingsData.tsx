import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Surface } from "@/components/shell/page";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { claimSuperAdmin, seedDemoData } from "@/lib/admin.functions";
import { exportTenantData } from "@/lib/export-tenant.functions";
import { useData } from "@/lib/store";
import { useT } from "@/lib/i18n";

export function SettingsData() {
  const t = useT();
  const reset = useData((s) => s.reset);
  const router = useRouter();
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const claim = useServerFn(claimSuperAdmin);
  const seed = useServerFn(seedDemoData);
  const exportFn = useServerFn(exportTenantData);
  const currentTenantId = useData((s) => s.currentTenantId);
  const claimMut = useMutation({
    mutationFn: () => claim(),
    onSuccess: (r) => setMsg(r.ok ? (r.alreadyOwner ? "You are already super-admin." : "Super-admin granted.") : "Already claimed by another user."),
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
  const exportMut = useMutation({
    mutationFn: async () => {
      if (!currentTenantId) throw new Error("No tenant selected");
      return exportFn({ data: { tenantId: currentTenantId } });
    },
    onSuccess: (r) => {
      const blob = new Blob([`\uFEFF${r.bundle}`], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = r.filename; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Tenant data exported");
    },
    onError: (e: Error) => setMsg(e.message),
  });

  return (
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
          title="Download a CSV bundle of all tenant data (GDPR)"
        >
          {exportMut.isPending ? "…" : "Export tenant data"}
        </button>
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
              <AlertDialogAction onClick={() => { reset(); toast.success("Local store reset"); }}>{t("reset")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {msg && <p className="text-xs text-dim mt-3">{msg}</p>}
    </Surface>
  );
}