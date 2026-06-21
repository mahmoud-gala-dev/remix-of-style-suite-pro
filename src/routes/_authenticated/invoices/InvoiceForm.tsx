import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Modal, Field, inputCls, ModalActions } from "@/components/ui/modal";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { emitWebhookEvent } from "@/lib/webhooks.functions";
import { calcSubtotal, calcInvoice, type Coupon } from "@/lib/billing";

type Props = {
  open: boolean;
  onClose: () => void;
  branchId: string;
  customers: { id: string; name: string }[];
  services: { id: string; nameEn: string; price: number; durationMin: number }[];
  onCreated: () => void;
};

export function InvoiceForm({ open, onClose, branchId, customers, services, onCreated }: Props) {
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
          <SummaryRow label="Subtotal" value={fmtMoney(subtotal)} />
          <SummaryRow label={`Tax (${taxPct}%)`} value={fmtMoney((subtotal * taxPct) / 100)} />
          <SummaryRow label="Estimated total" value={fmtMoney(subtotal + (subtotal * taxPct) / 100)} bold />
        </div>
        {err && <p className="text-xs text-red-400">{err}</p>}
        <ModalActions onCancel={onClose} saving={saving} saveLabel="Create invoice" />
      </form>
    </Modal>
  );
}

function SummaryRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-bold text-base pt-1 border-t border-white/5 mt-1" : "text-dim"}`}>
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}