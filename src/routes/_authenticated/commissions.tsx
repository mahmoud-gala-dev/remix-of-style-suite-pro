import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { useCurrentBranch, useData } from "@/lib/store";
import { useRole } from "@/lib/use-role";
import { listCommissions, markCommissionPaid } from "@/lib/commissions.functions";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/commissions")({
  ssr: false,
  head: () => ({ meta: [{ title: "Commissions — Vanguard Salon OS" }] }),
  component: () => <AppShell><CommissionsPage /></AppShell>,
});

function CommissionsPage() {
  const branch = useCurrentBranch();
  const employees = useData((s) => s.employees).filter((e) => e.branchId === branch.id);
  const { isAdmin } = useRole();
  const qc = useQueryClient();
  const fetchList = useServerFn(listCommissions);
  const markPaidFn = useServerFn(markCommissionPaid);

  const [filter, setFilter] = useState<"all" | "unpaid" | "paid">("unpaid");
  const [employeeFilter, setEmployeeFilter] = useState<string>("");

  const q = useQuery({
    queryKey: ["commissions", branch.id, filter, employeeFilter],
    queryFn: () => fetchList({ data: {
      branchId: branch.id,
      paid: filter === "all" ? undefined : filter === "paid",
      employeeId: employeeFilter || undefined,
    } }),
  });

  const markMut = useMutation({
    mutationFn: (ids: string[]) => markPaidFn({ data: { ids, paid: true } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["commissions", branch.id] }); toast.success("Marked paid"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const totals = useMemo(() => {
    const sum = (q.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
    return { count: q.data?.length ?? 0, sum };
  }, [q.data]);

  const empName = (id: string) => employees.find((e) => e.id === id)?.nameEn ?? id.slice(0, 6);

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Commissions" subtitle={`${totals.count} lines · ${fmtMoney(totals.sum)} total`} />
      <Surface className="mb-4 flex flex-wrap items-center gap-3">
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="rounded-md border border-border bg-transparent px-3 py-1.5 text-sm">
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="all">All</option>
        </select>
        <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="rounded-md border border-border bg-transparent px-3 py-1.5 text-sm">
          <option value="">All employees</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.nameEn}</option>)}
        </select>
        {isAdmin && filter === "unpaid" && (q.data?.length ?? 0) > 0 && (
          <button onClick={() => markMut.mutate((q.data ?? []).map((r) => r.id))} disabled={markMut.isPending}
            className="ml-auto px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest">
            Mark all paid
          </button>
        )}
      </Surface>
      <Surface padded={false}>
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-widest text-dim">
            <tr className="border-b border-border">
              <th className="text-start p-3">Date</th>
              <th className="text-start p-3">Employee</th>
              <th className="text-end p-3">Service price</th>
              <th className="text-end p-3">Rate</th>
              <th className="text-end p-3">Commission</th>
              <th className="text-center p-3">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {(q.data ?? []).map((r) => (
              <tr key={r.id} className="border-b border-border/40">
                <td className="p-3 text-dim text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="p-3">{empName(r.employee_id)}</td>
                <td className="p-3 text-end font-mono">{fmtMoney(Number(r.service_price))}</td>
                <td className="p-3 text-end font-mono">{Number(r.commission_pct)}%</td>
                <td className="p-3 text-end font-mono font-bold">{fmtMoney(Number(r.amount))}</td>
                <td className="p-3 text-center">
                  <span className={`text-[10px] px-2 py-1 rounded ${r.paid ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                    {r.paid ? "PAID" : "UNPAID"}
                  </span>
                </td>
                <td className="p-3 text-end">
                  {isAdmin && !r.paid && (
                    <button onClick={() => markMut.mutate([r.id])} className="text-xs text-primary">Mark paid</button>
                  )}
                </td>
              </tr>
            ))}
            {(!q.data || q.data.length === 0) && (
              <tr><td colSpan={7} className="p-6 text-center text-dim text-sm">No commissions in this view.</td></tr>
            )}
          </tbody>
        </table>
      </Surface>
      <p className="text-xs text-dim mt-4">Commissions are auto-generated when a booking is completed, using the employee's commission rate.</p>
    </div>
  );
}