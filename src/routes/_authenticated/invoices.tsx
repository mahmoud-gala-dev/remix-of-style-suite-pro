import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Plus, Printer, CheckCircle2 } from "lucide-react";
import { useCurrentBranch, useData } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { fmtMoney } from "@/lib/format";
import { DataState } from "@/components/shell/data-state";
import { InvoiceForm } from "./invoices/InvoiceForm";
import { InvoiceView } from "./invoices/InvoiceView";
import type { Invoice } from "./invoices/types";

export const Route = createFileRoute("/_authenticated/invoices")({
  ssr: false,
  head: () => ({ meta: [{ title: "Invoices" }] }),
  component: () => (
    <AppShell><Page /></AppShell>
  ),
});

function Page() {
  const t = useT();
  const branch = useCurrentBranch();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<Invoice | null>(null);
  const customers = useData((s) => s.customers);
  const services = useData((s) => s.services).filter((s) => s.branchId === branch.id);
  const branchCustomers = customers.filter((c) => c.branchId === branch.id);

  const q = useQuery({
    queryKey: ["invoices", branch.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("branch_id", branch.id)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return data as Invoice[];
    },
  });

  const list = q.data ?? [];

  async function markPaid(inv: Invoice) {
    await supabase.from("payments").insert({
      invoice_id: inv.id, branch_id: inv.branch_id,
      method: "cash", amount: inv.total,
    });
    await supabase.from("invoices").update({ status: "paid" }).eq("id", inv.id);
    qc.invalidateQueries({ queryKey: ["invoices"] });
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title={t("invoices")}
        subtitle={`${list.length} total · ${fmtMoney(list.reduce((s, i) => s + Number(i.total), 0))} billed`}
        actions={
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-xs font-bold uppercase tracking-widest">
            <Plus className="size-3.5" /> New invoice
          </button>
        }
      />

      <Surface padded={false}>
        <DataState
          loading={q.isLoading}
          error={q.error}
          empty={!q.isLoading && list.length === 0}
          emptyTitle={t("noData")}
          retry={() => q.refetch()}
        >
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-widest text-dim">
              <tr>
                <Th>Number</Th><Th>Date</Th><Th>Customer</Th>
                <Th>Total</Th><Th>Status</Th><Th>{" "}</Th>
              </tr>
            </thead>
            <tbody>
              {list.map((inv) => {
                const c = customers.find((cu) => cu.id === inv.customer_id);
                return (
                  <tr key={inv.id} className="border-t border-border hover:bg-surface-2/30 transition-colors">
                    <Td className="font-mono font-bold">{inv.number}</Td>
                    <Td className="font-mono text-xs text-dim">{new Date(inv.issued_at).toLocaleDateString()}</Td>
                    <Td>{c?.name ?? "—"}</Td>
                    <Td className="font-mono">{fmtMoney(Number(inv.total))}</Td>
                    <Td>
                      <span className={`text-[10px] px-2 py-0.5 rounded-sm uppercase font-bold ${
                        inv.status === "paid" ? "bg-emerald-500/15 text-emerald-400" :
                        inv.status === "partial" ? "bg-amber-500/15 text-amber-400" :
                        "bg-red-500/15 text-red-400"
                      }`}>{inv.status}</span>
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setViewing(inv)} className="text-xs text-dim hover:text-foreground inline-flex items-center gap-1">
                          <Printer className="size-3.5" /> View
                        </button>
                        {inv.status !== "paid" && (
                          <button onClick={() => markPaid(inv)} className="text-xs text-primary hover:brightness-110 inline-flex items-center gap-1">
                            <CheckCircle2 className="size-3.5" /> Mark paid
                          </button>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </DataState>
      </Surface>

      <InvoiceForm
        open={open} onClose={() => setOpen(false)} branchId={branch.id}
        customers={branchCustomers}
        services={services}
        onCreated={() => qc.invalidateQueries({ queryKey: ["invoices"] })}
      />
      {viewing && (
        <InvoiceView invoice={viewing} onClose={() => setViewing(null)} customers={customers} branchName={branch.nameEn} />
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-start px-4 py-3 font-bold">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}
