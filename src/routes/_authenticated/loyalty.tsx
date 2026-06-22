import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { Modal, Field, inputCls, ModalActions } from "@/components/ui/modal";
import { useCurrentBranch, useData } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { DataState } from "@/components/shell/data-state";

type Txn = {
  id: string; customer_id: string; delta: number; reason: string; created_at: string;
};

export const Route = createFileRoute("/_authenticated/loyalty")({
  ssr: false,
  head: () => ({ meta: [{ title: "Loyalty" }] }),
  component: () => (
    <AppShell><Page /></AppShell>
  ),
});

function Page() {
  const t = useT();
  const branch = useCurrentBranch();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const customers = useData((s) => s.customers).filter((c) => c.branchId === branch.id);

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isUuid = UUID_RE.test(branch.id);

  const q = useQuery({
    queryKey: ["points_transactions", branch.id],
    enabled: isUuid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("points_transactions")
        .select("*")
        .eq("branch_id", branch.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as Txn[];
    },
  });

  const txns = q.data ?? [];
  const totals = useMemo(() => {
    const map = new Map<string, number>();
    txns.forEach((x) => map.set(x.customer_id, (map.get(x.customer_id) ?? 0) + x.delta));
    return Array.from(map.entries())
      .map(([cid, total]) => ({ cid, total, customer: customers.find((c) => c.id === cid) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [txns, customers]);

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      <PageHeader
        title={t("loyalty")}
        subtitle={`${txns.length} transactions · ${txns.reduce((s, t) => s + t.delta, 0)} pts awarded`}
        actions={
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-xs font-bold uppercase tracking-widest">
            <Plus className="size-3.5" /> Award points
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Surface className="lg:col-span-1">
          <h3 className="font-display uppercase tracking-tight text-sm mb-3 flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> Top earners
          </h3>
          <ul className="space-y-2">
            {totals.map((row) => (
              <li key={row.cid} className="flex items-center justify-between text-sm">
                <span className="truncate">{row.customer?.name ?? "—"}</span>
                <span className="font-mono text-primary">{row.total} pts</span>
              </li>
            ))}
            {totals.length === 0 && <li className="text-xs text-dim">{t("noData")}</li>}
          </ul>
        </Surface>

        <Surface padded={false} className="lg:col-span-2 overflow-hidden">
          <DataState
            loading={q.isLoading}
            error={q.error}
            empty={!q.isLoading && txns.length === 0}
            emptyTitle={t("noData")}
            retry={() => q.refetch()}
          >
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-widest text-dim">
              <tr>
                <Th>Date</Th>
                <Th>Customer</Th>
                <Th>Reason</Th>
                <Th>Points</Th>
              </tr>
            </thead>
            <tbody>
              {txns.map((x) => {
                const c = customers.find((cu) => cu.id === x.customer_id);
                return (
                  <tr key={x.id} className="border-t border-border">
                    <Td className="font-mono text-xs text-dim">{new Date(x.created_at).toLocaleString()}</Td>
                    <Td>{c?.name ?? "—"}</Td>
                    <Td className="text-dim text-xs">{x.reason}</Td>
                    <Td className={`font-mono font-bold ${x.delta >= 0 ? "text-primary" : "text-red-400"}`}>
                      {x.delta > 0 ? `+${x.delta}` : x.delta}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </DataState>
        </Surface>
      </div>

      <PointsDialog
        open={open}
        onClose={() => setOpen(false)}
        branchId={branch.id}
        customers={customers}
        onCreated={() => qc.invalidateQueries({ queryKey: ["points_transactions"] })}
      />
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-start px-4 py-3 font-bold">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

function PointsDialog({
  open, onClose, branchId, customers, onCreated,
}: {
  open: boolean; onClose: () => void; branchId: string;
  customers: { id: string; name: string }[]; onCreated: () => void;
}) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [delta, setDelta] = useState(10);
  const [reason, setReason] = useState("manual");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr(null);
    const { error } = await supabase.from("points_transactions").insert({
      customer_id: customerId, branch_id: branchId, delta, reason,
    });
    if (error) { setErr(error.message); setSaving(false); return; }
    onCreated(); setSaving(false); onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Award / redeem points">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Customer">
          <select required value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputCls}>
            <option value="">—</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Points (+/-)"><input type="number" value={delta} onChange={(e) => setDelta(+e.target.value)} className={inputCls} /></Field>
          <Field label="Reason"><input value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} /></Field>
        </div>
        {err && <p className="text-xs text-red-400">{err}</p>}
        <ModalActions onCancel={onClose} saving={saving} />
      </form>
    </Modal>
  );
}