import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { DataState } from "@/components/shell/data-state";
import { Button } from "@/components/ui/button";
import { getAuditLog } from "@/lib/audit.functions";
import { downloadCsv, toCsv } from "@/lib/csv";
import { downloadXlsx } from "@/lib/xlsx";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/audit")({
  ssr: false,
  head: () => ({ meta: [{ title: "Audit Log" }] }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});

function Page() {
  const t = useT();
  const [table, setTable] = useState("");
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [limit, setLimit] = useState(100);
  const fetchLog = useServerFn(getAuditLog);
  const q = useInfiniteQuery({
    queryKey: ["audit", table, action, actor, from, to, limit],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      fetchLog({
        data: {
          table: table || undefined,
          action: action || undefined,
          actor: actor.trim() || undefined,
          from: from || undefined,
          to: to || undefined,
          limit,
          cursor: pageParam,
        },
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const rows = q.data?.pages.flatMap((p) => p.rows) ?? [];

  const exportCsv = () => {
    const data = rows.map((r) => ({
      at: r.at,
      table: r.table_name,
      action: r.action,
      actor: r.actor ?? "",
      row_id: r.row_id ?? "",
      diff: JSON.stringify(r.diff ?? {}),
    }));
    const headers = [
      { key: "at" as const, label: "When" },
      { key: "table" as const, label: "Table" },
      { key: "action" as const, label: "Action" },
      { key: "actor" as const, label: "Actor" },
      { key: "row_id" as const, label: "Row" },
      { key: "diff" as const, label: "Diff" },
    ];
    downloadCsv(`audit-${Date.now()}.csv`, toCsv(data, headers));
  };

  const exportXlsx = () => {
    const data = rows.map((r) => ({
      at: new Date(r.at).toLocaleString(),
      table: r.table_name,
      action: r.action,
      actor: r.actor ?? "",
      row_id: r.row_id ?? "",
      diff: JSON.stringify(r.diff ?? {}),
    }));
    downloadXlsx(
      `audit-${Date.now()}.xlsx`,
      data,
      [
        { key: "at", label: "When" },
        { key: "table", label: "Table" },
        { key: "action", label: "Action" },
        { key: "actor", label: "Actor" },
        { key: "row_id", label: "Row" },
        { key: "diff", label: "Diff" },
      ],
      "Audit",
    );
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader title={t("auditLog")} subtitle={t("auditSubtitle")} />
      <Surface>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-4">
          <select value={table} onChange={(e) => setTable(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            <option value="">{t("allTables")}</option>
            <option value="user_roles">user_roles</option>
            <option value="bookings">bookings</option>
            <option value="invoices">invoices</option>
          </select>
          <select value={action} onChange={(e) => setAction(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            <option value="">{t("allActions")}</option>
            <option value="INSERT">INSERT</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
          <input
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            placeholder={t("actorUserId")}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
          />
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            {[50, 100, 200, 500].map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
        </div>
        <div className="mb-3 flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
            {t("exportCsv")}
          </Button>
          <Button size="sm" onClick={exportXlsx} disabled={rows.length === 0}>
            {t("exportXlsx")}
          </Button>
        </div>
        <DataState
          loading={q.isLoading}
          error={q.error}
          empty={!q.isLoading && rows.length === 0}
          emptyTitle={t("noAuditEvents")}
          retry={() => q.refetch()}
        >
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background z-10">
                <tr className="text-left uppercase tracking-wider text-dim border-b border-border">
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3">Table</th>
                  <th className="py-2 pr-3">Action</th>
                  <th className="py-2 pr-3">Actor</th>
                  <th className="py-2 pr-3">Row</th>
                  <th className="py-2 pr-3">Diff</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 align-top">
                    <td className="py-2 pr-3 whitespace-nowrap">{new Date(r.at).toLocaleString()}</td>
                    <td className="py-2 pr-3">{r.table_name}</td>
                    <td className="py-2 pr-3">{r.action}</td>
                    <td className="py-2 pr-3 font-mono">{r.actor?.slice(0, 8) ?? "—"}</td>
                    <td className="py-2 pr-3 font-mono">{r.row_id?.slice(0, 8) ?? "—"}</td>
                    <td className="py-2 pr-3 max-w-[480px]">
                      <pre className="overflow-x-auto text-[10px] text-dim">{JSON.stringify(r.diff, null, 0).slice(0, 240)}</pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[11px] text-dim">{rows.length} loaded</span>
            {q.hasNextPage && (
              <Button variant="outline" size="sm" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>
                {q.isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            )}
          </div>
        </DataState>
      </Surface>
    </div>
  );
}