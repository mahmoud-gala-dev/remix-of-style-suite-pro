import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Plus, Printer, CheckCircle2 } from "lucide-react";
import { Modal, Field, inputCls, ModalActions } from "@/components/ui/modal";
import { useCurrentBranch, useData } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { fmtMoney } from "@/lib/format";
import { DataState } from "@/components/shell/data-state";
import { useServerFn } from "@tanstack/react-start";
import { emitWebhookEvent } from "@/lib/webhooks.functions";

type Invoice = {
  id: string; number: string; customer_id: string | null; branch_id: string | null;
  subtotal: number; discount: number; tax: number; total: number;
  status: string; issued_at: string;
};
type InvoiceItem = {
  id: string; invoice_id: string; description: string; qty: number;
  unit_price: number; total: number;
};

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
              <Th>Number</Th>
              <Th>Date</Th>
              <Th>Customer</Th>
              <Th>Total</Th>
              <Th>Status</Th>
              <Th>{" "}</Th>
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
                    }`}>
                      {inv.status}
                    </span>
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

      <InvoiceDialog
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

function InvoiceDialog({
  open, onClose, branchId, customers, services, onCreated,
}: {
  open: boolean; onClose: () => void; branchId: string;
  customers: { id: string; name: string }[];
  services: { id: string; nameEn: string; price: number; durationMin: number }[];
  onCreated: () => void;
}) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [couponCode, setCouponCode] = useState("");
  const [taxPct, setTaxPct] = useState(14);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const emitWebhook = useServerFn(emitWebhookEvent);

  const svc = services.find((s) => s.id === serviceId);
  const unitPrice = svc?.price ?? 0;
  const subtotal = calcSubtotal(unitPrice, qty);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr(null);

    let coupon: Coupon = null;
    let couponId: string | null = null;
    if (couponCode.trim()) {
      const { data: coup } = await supabase
        .from("coupons").select("*").eq("code", couponCode.trim().toUpperCase()).maybeSingle();
      if (coup && coup.active) {
        couponId = coup.id;
        coupon = { kind: coup.kind as "percent" | "amount", value: Number(coup.value) };
        await supabase.from("coupons").update({ used_count: (coup.used_count ?? 0) + 1 }).eq("id", coup.id);
      }
    }
    const { discount, tax, total } = calcInvoice({ unitPrice, qty, taxPct, coupon });

    const { data: inv, error: invErr } = await supabase
      .from("invoices")
      .insert({
        branch_id: branchId, customer_id: customerId,
        subtotal, discount, tax, total, status: "unpaid", coupon_id: couponId,
      })
      .select().single();
    if (invErr || !inv) { setErr(invErr?.message ?? "Failed"); setSaving(false); return; }

    const { error: itemErr } = await supabase.from("invoice_items").insert({
      invoice_id: inv.id,
      service_id: serviceId || null,
      description: svc?.nameEn ?? "Service",
      qty, unit_price: unitPrice, total: subtotal,
    });
    if (itemErr) { setErr(itemErr.message); setSaving(false); return; }

    // P35 — fire-and-forget webhook
    emitWebhook({ data: { event: "invoice.created", payload: {
      id: inv.id, branch_id: branchId, customer_id: customerId,
      subtotal, discount, tax, total, status: "unpaid",
    } } }).catch(() => {});

    onCreated(); setSaving(false); onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New invoice" size="lg">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Customer">
          <select required value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputCls}>
            <option value="">—</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Field label="Service">
              <select required value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={inputCls}>
                <option value="">—</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.nameEn} · {fmtMoney(s.price)}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Qty"><input type="number" min={1} value={qty} onChange={(e) => setQty(+e.target.value)} className={inputCls} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Coupon code (optional)"><input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} className={inputCls} placeholder="WELCOME10" /></Field>
          <Field label="Tax %"><input type="number" min={0} value={taxPct} onChange={(e) => setTaxPct(+e.target.value)} className={inputCls} /></Field>
        </div>
        <div className="bg-surface-2/50 rounded-md p-4 text-sm space-y-1">
          <Row label="Subtotal" value={fmtMoney(subtotal)} />
          <Row label={`Tax (${taxPct}%)`} value={fmtMoney(((subtotal) * taxPct) / 100)} />
          <Row label="Estimated total" value={fmtMoney(subtotal + (subtotal * taxPct) / 100)} bold />
        </div>
        {err && <p className="text-xs text-red-400">{err}</p>}
        <ModalActions onCancel={onClose} saving={saving} saveLabel="Create invoice" />
      </form>
    </Modal>
  );
}

function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-bold text-base pt-1 border-t border-white/5 mt-1" : "text-dim"}`}>
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function InvoiceView({
  invoice, customers, branchName, onClose,
}: {
  invoice: Invoice; customers: { id: string; name: string; phone?: string }[];
  branchName: string; onClose: () => void;
}) {
  const customer = customers.find((c) => c.id === invoice.customer_id);
  const itemsQ = useQuery({
    queryKey: ["invoice_items", invoice.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_items").select("*").eq("invoice_id", invoice.id);
      if (error) throw error;
      return data as InvoiceItem[];
    },
  });
  const items = itemsQ.data ?? [];

  return (
    <Modal open onClose={onClose} title={`Invoice ${invoice.number}`} size="lg">
      <div id="printable-invoice" className="bg-white text-black rounded p-8 print:p-0">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">{branchName}</h1>
            <p className="text-xs text-neutral-500 uppercase tracking-widest mt-1">Tax invoice</p>
          </div>
          <div className="text-end">
            <div className="font-mono font-bold text-xl">{invoice.number}</div>
            <div className="text-xs text-neutral-500">{new Date(invoice.issued_at).toLocaleDateString()}</div>
          </div>
        </div>
        <div className="mb-6 text-sm">
          <div className="text-xs uppercase text-neutral-500">Billed to</div>
          <div className="font-semibold">{customer?.name ?? "—"}</div>
        </div>
        <table className="w-full text-sm mb-6 border-t border-neutral-200">
          <thead><tr className="text-xs text-neutral-500">
            <th className="text-start py-2">Description</th>
            <th className="text-end py-2">Qty</th>
            <th className="text-end py-2">Unit</th>
            <th className="text-end py-2">Total</th>
          </tr></thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t border-neutral-100">
                <td className="py-2">{it.description}</td>
                <td className="py-2 text-end font-mono">{it.qty}</td>
                <td className="py-2 text-end font-mono">{fmtMoney(Number(it.unit_price))}</td>
                <td className="py-2 text-end font-mono">{fmtMoney(Number(it.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="ms-auto w-64 text-sm space-y-1">
          <RowBW label="Subtotal" value={fmtMoney(Number(invoice.subtotal))} />
          {Number(invoice.discount) > 0 && <RowBW label="Discount" value={`- ${fmtMoney(Number(invoice.discount))}`} />}
          <RowBW label="Tax" value={fmtMoney(Number(invoice.tax))} />
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-neutral-200 font-bold">
            <span>Total</span><span className="font-mono">{fmtMoney(Number(invoice.total))}</span>
          </div>
          <div className="text-xs uppercase tracking-widest text-neutral-500 pt-2">Status: {invoice.status}</div>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-white/5 print:hidden">
        <button onClick={onClose} className="px-3 py-2 text-xs uppercase tracking-widest border border-white/10 rounded-md">Close</button>
        <button onClick={() => window.print()} className="px-3 py-2 text-xs uppercase tracking-widest font-bold bg-primary text-primary-foreground rounded-md inline-flex items-center gap-2">
          <Printer className="size-3.5" /> Print / Save PDF
        </button>
      </div>
    </Modal>
  );
}

function RowBW({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-neutral-600">
      <span>{label}</span><span className="font-mono">{value}</span>
    </div>
  );
}