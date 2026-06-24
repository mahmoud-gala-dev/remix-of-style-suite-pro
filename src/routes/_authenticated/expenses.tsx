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
import { Plus, Trash2 } from "lucide-react";
import { RouteError, RouteNotFound } from "@/components/shell/route-error";
import {
  listExpenses, createExpense, deleteExpense,
  listExpenseCategories, createExpenseCategory, expenseSummary,
} from "@/lib/expenses.functions";

export const Route = createFileRoute("/_authenticated/expenses")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  ssr: false,
  head: () => ({ meta: [{ title: "Expenses" }] }),
  component: () => (<AppShell><Page /></AppShell>),
});

function Page() {
  const t = useT();
  const branch = useCurrentBranch();
  const qc = useQueryClient();
  const listFn = useServerFn(listExpenses);
  const createFn = useServerFn(createExpense);
  const delFn = useServerFn(deleteExpense);
  const catsFn = useServerFn(listExpenseCategories);
  const newCatFn = useServerFn(createExpenseCategory);
  const summaryFn = useServerFn(expenseSummary);

  const expQ = useQuery({
    queryKey: ["expenses", branch.id],
    queryFn: () => listFn({ data: { branchId: branch.id } }),
  });
  const catsQ = useQuery({
    queryKey: ["expense_categories", branch.id],
    queryFn: () => catsFn({ data: { branchId: branch.id } }),
  });
  const sumQ = useQuery({
    queryKey: ["expense_summary", branch.id],
    queryFn: () => summaryFn({ data: { branchId: branch.id } }),
  });

  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [vendor, setVendor] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [newCat, setNewCat] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["expenses", branch.id] });
    qc.invalidateQueries({ queryKey: ["expense_summary", branch.id] });
  };

  const addMut = useMutation({
    mutationFn: () => createFn({ data: {
      branchId: branch.id,
      amount: Number(amount),
      categoryId: categoryId || undefined,
      description: desc || undefined,
      vendor: vendor || undefined,
    }}),
    onSuccess: () => {
      toast.success(t("expense_added"));
      setAmount(""); setDesc(""); setVendor("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addCatMut = useMutation({
    mutationFn: () => newCatFn({ data: { branchId: branch.id, name: newCat } }),
    onSuccess: () => {
      toast.success(t("category_added"));
      setNewCat("");
      qc.invalidateQueries({ queryKey: ["expense_categories", branch.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const expenses = expQ.data ?? [];
  const cats = catsQ.data ?? [];
  const summary = sumQ.data;
  const catName = (id: string | null) =>
    cats.find((c) => c.id === id)?.name ?? "—";

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader title={t("expenses")} subtitle={t("expenses_sub")} />

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Surface>
            <div className="text-xs uppercase tracking-widest text-dim">{t("total_revenue")}</div>
            <div className="text-2xl font-bold mt-1">{summary.totalRevenue.toFixed(2)}</div>
          </Surface>
          <Surface>
            <div className="text-xs uppercase tracking-widest text-dim">{t("total_expenses")}</div>
            <div className="text-2xl font-bold mt-1">{summary.totalExpenses.toFixed(2)}</div>
          </Surface>
          <Surface>
            <div className="text-xs uppercase tracking-widest text-dim">{t("net_profit")}</div>
            <div className={`text-2xl font-bold mt-1 ${summary.netProfit >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {summary.netProfit.toFixed(2)}
            </div>
          </Surface>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Surface className="lg:col-span-2">
          <h3 className="text-sm font-bold uppercase tracking-widest mb-4">{t("record_expense")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input type="number" min={0} step="0.01" placeholder={t("amount")}
              value={amount} onChange={(e) => setAmount(e.target.value)} />
            <select className="bg-surface-2 border border-border rounded-md px-3 py-2 text-sm"
              value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">{t("uncategorized")}</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Input placeholder={t("vendor")} value={vendor}
              onChange={(e) => setVendor(e.target.value)} />
            <Input placeholder={t("description")} value={desc}
              onChange={(e) => setDesc(e.target.value)} />
          </div>
          <Button className="mt-4 w-full" onClick={() => addMut.mutate()}
            disabled={!amount || addMut.isPending}>
            <Plus className="size-4 me-1" /> {addMut.isPending ? "…" : t("record_expense")}
          </Button>
        </Surface>

        <Surface>
          <h3 className="text-sm font-bold uppercase tracking-widest mb-4">{t("categories")}</h3>
          <div className="space-y-2 mb-4">
            {cats.map((c) => (
              <div key={c.id} className="text-sm py-1.5 border-b border-border last:border-0">
                {c.name}
              </div>
            ))}
            {cats.length === 0 && <div className="text-xs text-dim">{t("no_categories")}</div>}
          </div>
          <div className="flex gap-2">
            <Input placeholder={t("new_category")} value={newCat}
              onChange={(e) => setNewCat(e.target.value)} />
            <Button size="sm" onClick={() => addCatMut.mutate()}
              disabled={!newCat || addCatMut.isPending}>
              <Plus className="size-4" />
            </Button>
          </div>
        </Surface>
      </div>

      <DataState loading={expQ.isLoading} error={expQ.error}
        empty={!expQ.isLoading && expenses.length === 0}
        emptyTitle={t("no_expenses")} retry={() => expQ.refetch()}>
        <Surface padded={false} className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-2/40 text-[10px] uppercase tracking-widest text-dim">
              <tr>
                <th className="text-start px-4 py-3">{t("date")}</th>
                <th className="text-start px-4 py-3">{t("category")}</th>
                <th className="text-start px-4 py-3">{t("vendor")}</th>
                <th className="text-start px-4 py-3">{t("description")}</th>
                <th className="text-end px-4 py-3">{t("amount")}</th>
                <th className="text-end px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs">{e.expense_date}</td>
                  <td className="px-4 py-3 text-xs">{catName(e.category_id)}</td>
                  <td className="px-4 py-3 text-xs">{e.vendor ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">{e.description ?? "—"}</td>
                  <td className="px-4 py-3 text-end font-mono">
                    {Number(e.amount).toFixed(2)} {e.currency}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <Button size="sm" variant="ghost"
                      onClick={() => delMut.mutate(e.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Surface>
      </DataState>
    </div>
  );
}