import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { Modal, Field, inputCls, ModalActions } from "@/components/ui/modal";
import { useCurrentBranch } from "@/lib/store";
import { listProducts, upsertProduct, recordStockMovement, type Product } from "@/lib/products.functions";
import { fmtMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { RouteError, RouteNotFound } from "@/components/shell/route-error";

export const Route = createFileRoute("/_authenticated/inventory")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  ssr: false,
  head: () => ({ meta: [{ title: "Inventory — Vanguard Salon OS" }] }),
  component: () => <AppShell><InventoryPage /></AppShell>,
});

function InventoryPage() {
  const t = useT();
  const branch = useCurrentBranch();
  const qc = useQueryClient();
  const fetchList = useServerFn(listProducts);
  const saveFn = useServerFn(upsertProduct);
  const moveFn = useServerFn(recordStockMovement);

  const q = useQuery({
    queryKey: ["products", branch.id],
    queryFn: () => fetchList({ data: { branchId: branch.id } }),
  });

  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [stockFor, setStockFor] = useState<Product | null>(null);

  const saveMut = useMutation({
    mutationFn: (p: Partial<Product>) => saveFn({ data: {
      id: p.id, branch_id: branch.id, name: p.name ?? "", sku: p.sku ?? null,
      unit: p.unit ?? "unit", cost: Number(p.cost ?? 0), price: Number(p.price ?? 0),
      low_stock_threshold: Number(p.low_stock_threshold ?? 0), active: p.active ?? true,
    } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products", branch.id] }); setEditing(null); toast.success(t("saved")); },
    onError: (e: Error) => toast.error(e.message),
  });

  const moveMut = useMutation({
    mutationFn: (m: { product_id: string; kind: "purchase"|"sale"|"usage"|"adjustment"|"waste"; qty: number; note?: string }) =>
      moveFn({ data: { ...m, branch_id: branch.id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products", branch.id] }); setStockFor(null); toast.success(t("recorded")); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader
        title={t("inventory")}
        subtitle={t("inventorySubtitle")}
        actions={
          <button onClick={() => setEditing({ active: true, unit: "unit" })}
            className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest">
            {t("newProduct")}
          </button>
        }
      />
      <Surface padded={false}>
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-widest text-dim">
            <tr className="border-b border-border">
              <th className="text-start p-3">{t("name")}</th>
              <th className="text-start p-3">{t("sku")}</th>
              <th className="text-end p-3">{t("cost")}</th>
              <th className="text-end p-3">{t("price")}</th>
              <th className="text-end p-3">{t("stock")}</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {(q.data ?? []).map((p) => {
              const low = p.stock <= p.low_stock_threshold;
              return (
                <tr key={p.id} className="border-b border-border/40">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 text-dim text-xs">{p.sku ?? "—"}</td>
                  <td className="p-3 text-end font-mono">{fmtMoney(p.cost)}</td>
                  <td className="p-3 text-end font-mono">{fmtMoney(p.price)}</td>
                  <td className={`p-3 text-end font-mono ${low ? "text-destructive font-bold" : ""}`}>
                    {p.stock} {p.unit}
                  </td>
                  <td className="p-3 text-end space-x-2">
                    <button onClick={() => setStockFor(p)} className="text-xs text-primary">{t("moveStock")}</button>
                    <button onClick={() => setEditing(p)} className="text-xs text-dim">{t("edit")}</button>
                  </td>
                </tr>
              );
            })}
            {(!q.data || q.data.length === 0) && (
              <tr><td colSpan={6} className="p-6 text-center text-dim text-sm">{t("noProductsYet")}</td></tr>
            )}
          </tbody>
        </table>
      </Surface>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? t("editProduct") : t("newProduct")}>
        {editing && (
          <form onSubmit={(e) => { e.preventDefault(); saveMut.mutate(editing); }} className="space-y-3">
            <Field label={t("name")}><input required className={inputCls} value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("sku")}><input className={inputCls} value={editing.sku ?? ""} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} /></Field>
              <Field label={t("unit")}><input className={inputCls} value={editing.unit ?? "unit"} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label={t("cost")}><input type="number" step="0.01" className={inputCls} value={editing.cost ?? 0} onChange={(e) => setEditing({ ...editing, cost: Number(e.target.value) })} /></Field>
              <Field label={t("price")}><input type="number" step="0.01" className={inputCls} value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></Field>
              <Field label={t("lowStockAt")}><input type="number" step="0.01" className={inputCls} value={editing.low_stock_threshold ?? 0} onChange={(e) => setEditing({ ...editing, low_stock_threshold: Number(e.target.value) })} /></Field>
            </div>
            <ModalActions onCancel={() => setEditing(null)} saving={saveMut.isPending} />
          </form>
        )}
      </Modal>

      <Modal open={!!stockFor} onClose={() => setStockFor(null)} title={t("stockMovementTitle").replace("{name}", stockFor?.name ?? "")}>
        {stockFor && <StockMovementForm productId={stockFor.id} onSubmit={(m) => moveMut.mutate(m)} pending={moveMut.isPending} onCancel={() => setStockFor(null)} />}
      </Modal>
    </div>
  );
}

function StockMovementForm({
  productId, onSubmit, pending, onCancel,
}: {
  productId: string;
  onSubmit: (m: { product_id: string; kind: "purchase"|"sale"|"usage"|"adjustment"|"waste"; qty: number; note?: string }) => void;
  pending: boolean;
  onCancel: () => void;
}) {
  const t = useT();
  const [kind, setKind] = useState<"purchase"|"sale"|"usage"|"adjustment"|"waste">("purchase");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ product_id: productId, kind, qty, note: note || undefined }); }} className="space-y-3">
      <Field label={t("kind")}>
        <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="purchase">{t("stockPurchase")}</option>
          <option value="sale">{t("stockSale")}</option>
          <option value="usage">{t("stockUsage")}</option>
          <option value="adjustment">{t("stockAdjustment")}</option>
          <option value="waste">{t("stockWaste")}</option>
        </select>
      </Field>
      <Field label={t("quantityNeg")}>
        <input type="number" step="0.01" className={inputCls} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
      </Field>
      <Field label={t("note")}>
        <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <ModalActions onCancel={onCancel} saving={pending} />
    </form>
  );
}