import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Surface } from "@/components/shell/page";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { claimSuperAdmin, seedDemoData } from "@/lib/admin.functions";
import { useData } from "@/lib/store";

export function SettingsData() {
  const reset = useData((s) => s.reset);
  const router = useRouter();
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const claim = useServerFn(claimSuperAdmin);
  const seed = useServerFn(seedDemoData);
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

  return (
    <Surface>
      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim mb-4">Data</h3>
      <p className="text-xs text-dim mb-3">First-time setup: claim super-admin, then load demo data into Lovable Cloud.</p>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => claimMut.mutate()} disabled={claimMut.isPending} className="px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest border border-primary/40 text-primary hover:bg-primary/10 disabled:opacity-50">
          {claimMut.isPending ? "…" : "Claim super-admin"}
        </button>
        <button onClick={() => seedMut.mutate()} disabled={seedMut.isPending} className="px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest border border-primary/40 text-primary hover:bg-primary/10 disabled:opacity-50">
          {seedMut.isPending ? "…" : "Load demo data"}
        </button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest border border-destructive/40 text-destructive hover:bg-destructive/10">Reset local</button>
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
  );
}