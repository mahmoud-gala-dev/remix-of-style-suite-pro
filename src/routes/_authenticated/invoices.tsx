import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { Plus, Printer, CheckCircle2 } from "lucide-react";
import { useCurrentBranch, useData } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { fmtMoney } from "@/lib/format";
import { DataState } from "@/components/shell/data-state";
import { InvoiceForm } from "./invoices/-InvoiceForm";
import { InvoiceView } from "./invoices/-InvoiceView";
import type { Invoice } from "./invoices/-types";

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
  const [status, setStatus] = useState<"all" | "paid" | "partial" | "unpaid">("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;
  const customers = useData((s) => s.customers);
  const services = useData((s) => s.services).filter((s) => s.branchId === branch.id);
  const branchCustomers = customers.filter((c) => c.branchId === branch.id);

  const q = useQuery({
    queryKey: ["invoices", branch.id, status, from, to, page],
    queryFn: async () => {
      let query = supabase
        .from("invoices")
        .select("*", { count: "exact" })
        .eq("branch_id", branch.id)
        .order("issued_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (status !== "all") query = query.eq("status", status);
      if (from) query = query.gte("issued_at", from);
      if (to) query = query.lte("issued_at", to);
      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data as Invoice[], count: count ?? 0 };
    },
  });

  const list = q.data?.rows ?? [];
  const total = q.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const billed = useMemo(() => list.reduce((s, i) => s + Number(i.total), 0), [list]);

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
        subtitle={t("invoiceCount").replace("{n}", String(total)).replace("{amt}", fmtMoney(billed))}
        actions={
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-xs font-bold uppercase tracking-widest">
            <Plus className="size-3.5" /> {t("newInvoice")}
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as typeof status); setPage(0); }}
          className="bg-surface border border-border rounded-md px-2 py-1.5 text-xs"
        >
          <option value="all">{t("allStatuses")}</option>
          <option value="paid">{t("paid")}</option>
          <option value="partial">{t("partial")}</option>
          <option value="unpaid">{t("unpaid")}</option>
        </select>
        <input
          type="date" value={from}
          onChange={(e) => { setFrom(e.target.value); setPage(0); }}
          className="bg-surface border border-border rounded-md px-2 py-1.5 text-xs"
          aria-label={t("fromDate")}
        />
        <input
          type="date" value={to}
          onChange={(e) => { setTo(e.target.value); setPage(0); }}
          className="bg-surface border border-border rounded-md px-2 py-1.5 text-xs"
          aria-label={t("toDate")}
        />
        {(status !== "all" || from || to) && (
          <button
            onClick={() => { setStatus("all"); setFrom(""); setTo(""); setPage(0); }}
            className="text-xs text-dim hover:text-foreground underline"
          >{t("clear")}</button>
        )}
      </div>

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
                <Th>{t("invoiceNumberCol")}</Th><Th>{t("date")}</Th><Th>{t("customer")}</Th>
                <Th>{t("total")}</Th><Th>{t("status")}</Th><Th>{" "}</Th>
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
                          <Printer className="size-3.5" /> {t("view")}
                        </button>
                        {inv.status !== "paid" && (
                          <button onClick={() => markPaid(inv)} className="text-xs text-primary hover:brightness-110 inline-flex items-center gap-1">
                            <CheckCircle2 className="size-3.5" /> {t("markPaid")}
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

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-3 text-xs text-dim">
          <span>{t("pageOf").replace("{p}", String(page + 1)).replace("{t}", String(totalPages))}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 border border-border rounded-md disabled:opacity-40"
            >{t("prev")}</button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page + 1 >= totalPages}
              className="px-3 py-1.5 border border-border rounded-md disabled:opacity-40"
            >{t("next")}</button>
          </div>
        </div>
      )}

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
