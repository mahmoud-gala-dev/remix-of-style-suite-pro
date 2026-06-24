import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { DataState } from "@/components/shell/data-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentBranch } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Zap, Plus, Trash2 } from "lucide-react";
import { RouteError, RouteNotFound } from "@/components/shell/route-error";
import {
  listSuppliers, upsertSupplier, deleteSupplier,
  listPurchaseOrders, updatePOStatus,
  runAutoReorderScan, listLowStockProducts,
} from "@/lib/purchasing.functions";

export const Route = createFileRoute("/_authenticated/purchasing")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  ssr: false,
  head: () => ({ meta: [{ title: "Purchasing" }] }),
  component: () => (<AppShell><Page /></AppShell>),
});

function Page() {
  const t = useT();
  const branch = useCurrentBranch();
  const qc = useQueryClient();

  const supFn = useServerFn(listSuppliers);
  const upSupFn = useServerFn(upsertSupplier);
  const delSupFn = useServerFn(deleteSupplier);
  const poFn = useServerFn(listPurchaseOrders);
  const statusFn = useServerFn(updatePOStatus);
  const lowFn = useServerFn(listLowStockProducts);
  const scanFn = useServerFn(runAutoReorderScan);

  const supQ = useQuery({ queryKey: ["suppliers", branch.id], queryFn: () => supFn({ data: { branchId: branch.id } }) });
  const poQ = useQuery({ queryKey: ["pos", branch.id], queryFn: () => poFn({ data: { branchId: branch.id } }) });
  const lowQ = useQuery({ queryKey: ["low_stock", branch.id], queryFn: () => lowFn({ data: { branchId: branch.id } }) });

  const [supName, setSupName] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supEmail, setSupEmail] = useState("");

  const addSup = useMutation({
    mutationFn: () => upSupFn({ data: { branchId: branch.id, name: supName, phone: supPhone || null, email: supEmail || null } }),
    onSuccess: () => {
      setSupName(""); setSupPhone(""); setSupEmail("");
      qc.invalidateQueries({ queryKey: ["suppliers", branch.id] });
      toast.success(t("saved"));
    },
    onError: (e: any) => toast.error(e.message),
  });
  const delSup = useMutation({
    mutationFn: (id: string) => delSupFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers", branch.id] }),
  });
  const scan = useMutation({
    mutationFn: () => scanFn({ data: { branchId: branch.id } }),
    onSuccess: (r) => {
      toast.success(`${r.created} PO(s) created`);
      qc.invalidateQueries({ queryKey: ["pos", branch.id] });
      qc.invalidateQueries({ queryKey: ["low_stock", branch.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: "draft"|"sent"|"received"|"cancelled" }) =>
      statusFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pos", branch.id] }),
  });

  return (
    <>
      <PageHeader
        title={t("purchasing")}
        subtitle={t("purchasing_sub")}
        actions={
          <Button onClick={() => scan.mutate()} disabled={scan.isPending}>
            <Zap className="h-4 w-4 me-1" />
            {t("auto_reorder_scan")}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Surface className="p-4 space-y-3">
          <h3 className="font-semibold">{t("low_stock")}</h3>
          <DataState loading={lowQ.isLoading} error={lowQ.error} empty={!lowQ.data?.length}>
            <table className="w-full text-sm">
              <thead><tr className="text-start text-xs text-muted-foreground">
                <th className="text-start py-1">{t("name")}</th>
                <th>{t("stock")}</th>
                <th>{t("reorder_point")}</th>
                <th>{t("supplier")}</th>
              </tr></thead>
              <tbody>
                {lowQ.data?.map((p: any) => (
                  <tr key={p.id} className="border-t">
                    <td className="py-1">{p.name}</td>
                    <td className="text-center">{p.stock}</td>
                    <td className="text-center">{p.reorder_point}</td>
                    <td className="text-center">{p.suppliers?.name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataState>
        </Surface>

        <Surface className="p-4 space-y-3">
          <h3 className="font-semibold">{t("suppliers")}</h3>
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder={t("name")} value={supName} onChange={(e) => setSupName(e.target.value)} />
            <Input placeholder={t("phone")} value={supPhone} onChange={(e) => setSupPhone(e.target.value)} />
            <Input placeholder={t("email")} value={supEmail} onChange={(e) => setSupEmail(e.target.value)} />
          </div>
          <Button onClick={() => addSup.mutate()} disabled={!supName || addSup.isPending} size="sm">
            <Plus className="h-4 w-4 me-1" />{t("add")}
          </Button>
          <DataState loading={supQ.isLoading} error={supQ.error} empty={!supQ.data?.length}>
            <ul className="divide-y text-sm">
              {supQ.data?.map((s: any) => (
                <li key={s.id} className="py-1 flex justify-between">
                  <span>{s.name} <span className="text-xs text-muted-foreground">{s.phone || s.email || ""}</span></span>
                  <button onClick={() => delSup.mutate(s.id)} aria-label="delete">
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </button>
                </li>
              ))}
            </ul>
          </DataState>
        </Surface>
      </div>

      <Surface className="p-4 mt-4 space-y-3">
        <h3 className="font-semibold">{t("purchase_orders")}</h3>
        <DataState loading={poQ.isLoading} error={poQ.error} empty={!poQ.data?.length}>
          <table className="w-full text-sm">
            <thead><tr className="text-start text-xs text-muted-foreground">
              <th className="text-start py-1">{t("number")}</th>
              <th>{t("supplier")}</th>
              <th>{t("status")}</th>
              <th>{t("source")}</th>
              <th>{t("total")}</th>
              <th>{t("actions")}</th>
            </tr></thead>
            <tbody>
              {poQ.data?.map((po: any) => (
                <tr key={po.id} className="border-t">
                  <td className="py-1">{po.number}</td>
                  <td className="text-center">{po.suppliers?.name ?? "—"}</td>
                  <td className="text-center">{po.status}</td>
                  <td className="text-center">{po.source}</td>
                  <td className="text-center">{Number(po.total).toFixed(2)}</td>
                  <td className="text-center space-x-1">
                    {po.status === "draft" && (
                      <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: po.id, status: "sent" })}>{t("send")}</Button>
                    )}
                    {po.status === "sent" && (
                      <Button size="sm" onClick={() => setStatus.mutate({ id: po.id, status: "received" })}>{t("receive")}</Button>
                    )}
                    {(po.status === "draft" || po.status === "sent") && (
                      <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: po.id, status: "cancelled" })}>{t("cancel")}</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataState>
      </Surface>
    </>
  );
}