import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { RouteError, RouteNotFound } from "@/components/shell/route-error";
import { useCurrentBranch } from "@/lib/store";
import { useT, useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { listApprovals, resolveApproval } from "@/lib/approvals.functions";
import { useRole } from "@/lib/use-role";

export const Route = createFileRoute("/_authenticated/approvals")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  ssr: false,
  head: () => ({ meta: [{ title: "Approvals" }] }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});

const STATUSES = ["pending", "approved", "rejected", "cancelled"] as const;

function Page() {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const branch = useCurrentBranch();
  const role = useRole();
  const isAdmin = role === "admin" || role === "super_admin";
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("pending");
  const fetchList = useServerFn(listApprovals);
  const resolveFn = useServerFn(resolveApproval);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["approvals", branch?.id ?? null, status],
    queryFn: () => fetchList({ data: { branchId: branch?.id, status } }),
  });

  async function decide(id: string, decision: "approved" | "rejected") {
    try {
      await resolveFn({ data: { id, decision } });
      toast.success(t(decision === "approved" ? "approval_approved" : "approval_rejected"));
      qc.invalidateQueries({ queryKey: ["approvals"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="p-4 space-y-4">
      <PageHeader title={t("approvals_title")} subtitle={t("approvals_sub")} />
      <Surface className="p-3 flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-md px-3 py-1 text-xs ${
              status === s ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
            }`}
          >
            {t(`approval_status_${s}` as never)}
          </button>
        ))}
      </Surface>

      <Surface className="p-0 overflow-hidden">
        {isLoading && <div className="p-6 text-center text-sm text-muted-foreground">…</div>}
        {error && (
          <div className="p-6 text-center text-sm text-red-500">
            <AlertCircle className="inline size-4 me-1" />
            {(error as Error).message}
          </div>
        )}
        {data && data.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">{t("approvals_empty")}</div>
        )}
        {data && data.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-xs uppercase">
                <th className="p-3 text-start">{t("approval_kind")}</th>
                <th className="p-3 text-start">{t("approval_title_col")}</th>
                <th className="p-3 text-end">{t("acc_amount")}</th>
                <th className="p-3 text-start">{t("approval_when")}</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="p-3">
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs">
                      {t(`approval_kind_${r.kind}` as never)}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{r.title}</div>
                    {r.reason && <div className="text-xs text-muted-foreground mt-1">{r.reason}</div>}
                    {r.reference_id && (
                      <div className="text-xs text-muted-foreground/70 mt-1">ref: {r.reference_id}</div>
                    )}
                  </td>
                  <td className="p-3 text-end">
                    {typeof r.amount === "number" ? fmtMoney(r.amount, lang) : "—"}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString(lang === "ar" ? "ar-SA" : "en-US")}
                  </td>
                  <td className="p-3 text-end">
                    {r.status === "pending" && isAdmin ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={() => decide(r.id, "approved")}>
                          <Check className="size-4 me-1" />
                          {t("approve")}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => decide(r.id, "rejected")}>
                          <X className="size-4 me-1" />
                          {t("reject")}
                        </Button>
                      </div>
                    ) : (
                      <span
                        className={`text-xs ${
                          r.status === "approved"
                            ? "text-emerald-500"
                            : r.status === "rejected"
                            ? "text-red-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        {t(`approval_status_${r.status}` as never)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Surface>
    </div>
  );
}