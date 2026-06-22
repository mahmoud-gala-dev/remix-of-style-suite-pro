import { useQuery } from "@tanstack/react-query";
import { Printer, FileDown } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import type { Invoice, InvoiceItem } from "./types";

type Props = {
  invoice: Invoice;
  customers: { id: string; name: string; phone?: string }[];
  branchName: string;
  onClose: () => void;
};

export function InvoiceView({ invoice, customers, branchName, onClose }: Props) {
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

  async function downloadPdf() {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFontSize(18); doc.text(branchName, 40, 50);
    doc.setFontSize(10); doc.setTextColor(120);
    doc.text("TAX INVOICE", 40, 68);
    doc.setTextColor(0);
    doc.setFontSize(12); doc.text(`# ${invoice.number}`, 555, 50, { align: "right" });
    doc.setFontSize(10); doc.setTextColor(120);
    doc.text(new Date(invoice.issued_at).toLocaleDateString(), 555, 65, { align: "right" });
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.text(`Billed to: ${customer?.name ?? "—"}`, 40, 100);
    autoTable(doc, {
      startY: 120,
      head: [["Description", "Qty", "Unit", "Total"]],
      body: items.map((it) => [it.description, String(it.qty), fmtMoney(Number(it.unit_price)), fmtMoney(Number(it.total))]),
      headStyles: { fillColor: [30, 30, 30] },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
    });
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
    const right = 555; const labelX = 400;
    doc.setFontSize(10);
    doc.text("Subtotal", labelX, finalY); doc.text(fmtMoney(Number(invoice.subtotal)), right, finalY, { align: "right" });
    if (Number(invoice.discount) > 0) {
      doc.text("Discount", labelX, finalY + 15); doc.text(`- ${fmtMoney(Number(invoice.discount))}`, right, finalY + 15, { align: "right" });
    }
    doc.text("Tax", labelX, finalY + 30); doc.text(fmtMoney(Number(invoice.tax)), right, finalY + 30, { align: "right" });
    doc.setFontSize(12).setFont(undefined as unknown as string, "bold");
    doc.text("Total", labelX, finalY + 52); doc.text(fmtMoney(Number(invoice.total)), right, finalY + 52, { align: "right" });
    doc.save(`${invoice.number}.pdf`);
  }

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
        <button onClick={downloadPdf} className="px-3 py-2 text-xs uppercase tracking-widest border border-white/10 rounded-md inline-flex items-center gap-2">
          <FileDown className="size-3.5" /> Download PDF
        </button>
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