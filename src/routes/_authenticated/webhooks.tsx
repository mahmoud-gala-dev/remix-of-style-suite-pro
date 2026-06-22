import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { DataState } from "@/components/shell/data-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listWebhooks, upsertWebhook, deleteWebhook, listDeliveries, retryFailedWebhooks, sendTestPing } from "@/lib/webhooks.functions";
import { useT } from "@/lib/i18n";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RouteError, RouteNotFound } from "@/components/shell/route-error";

type Hook = Awaited<ReturnType<typeof listWebhooks>>[number];
type Delivery = Awaited<ReturnType<typeof listDeliveries>>[number];

export const Route = createFileRoute("/_authenticated/webhooks")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  ssr: false,
  head: () => ({ meta: [{ title: "Webhooks" }] }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});

function Page() {
  const t = useT();
  const fetchHooks = useServerFn(listWebhooks);
  const saveHook = useServerFn(upsertWebhook);
  const delHook = useServerFn(deleteWebhook);
  const fetchDeliveries = useServerFn(listDeliveries);
  const retryNow = useServerFn(retryFailedWebhooks);
  const ping = useServerFn(sendTestPing);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["webhooks"], queryFn: () => fetchHooks() });
  const dq = useQuery({ queryKey: ["webhook-deliveries"], queryFn: () => fetchDeliveries() });
  const [event, setEvent] = useState("booking.created");
  const [url, setUrl] = useState("");
  const [onlyFailed, setOnlyFailed] = useState(false);

  const add = useMutation({
    mutationFn: () => saveHook({ data: { event, url, enabled: true } }),
    onSuccess: () => { toast.success(t("webhookAdded")); setUrl(""); qc.invalidateQueries({ queryKey: ["webhooks"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("failed")),
  });
  const remove = useMutation({
    mutationFn: (id: string) => delHook({ data: { id } }),
    onSuccess: () => { toast.success(t("removed")); qc.invalidateQueries({ queryKey: ["webhooks"] }); },
  });
  const retry = useMutation({
    mutationFn: () => retryNow(),
    onSuccess: () => { toast.success(t("retrySuccess")); qc.invalidateQueries({ queryKey: ["webhook-deliveries"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const pingHook = useMutation({
    mutationFn: (id: string) => ping({ data: { id } }),
    onSuccess: (r: { status: number }) => {
      const ok = r.status >= 200 && r.status < 400;
      ok ? toast.success(`Ping ${r.status}`) : toast.error(`Ping ${r.status || "failed"}`);
      qc.invalidateQueries({ queryKey: ["webhook-deliveries"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-6">
      <PageHeader title={t("webhooks")} subtitle={t("webhooksSubtitle")} />
      <Tabs defaultValue="hooks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="hooks">{t("webhooks")}</TabsTrigger>
          <TabsTrigger value="deliveries">{t("deliveries")}</TabsTrigger>
        </TabsList>
        <TabsContent value="hooks" className="space-y-6">
          <Surface>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="space-y-1.5 text-xs">
            <span className="text-dim">{t("event")}</span>
            <select className="h-9 rounded-md border bg-bg-2 px-3 text-sm"
              value={event} onChange={(e) => setEvent(e.target.value)}>
              <option value="booking.created">booking.created</option>
              <option value="booking.cancelled">booking.cancelled</option>
              <option value="invoice.paid">invoice.paid</option>
              <option value="customer.created">customer.created</option>
            </select>
          </label>
          <label className="space-y-1.5 text-xs flex-1 min-w-[280px]">
            <span className="text-dim">{t("url")}</span>
            <Input value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://hooks.zapier.com/..." />
          </label>
          <Button onClick={() => add.mutate()} disabled={!url || add.isPending}>{t("add")}</Button>
        </div>
          </Surface>
          <Surface>
        <DataState loading={q.isLoading} error={q.error}
          empty={!q.isLoading && (q.data?.length ?? 0) === 0}
          emptyTitle={t("noWebhooks")} retry={() => q.refetch()}>
          <table className="w-full text-sm">
            <thead className="text-xs text-dim text-left">
              <tr><th className="py-2">{t("event")}</th><th>{t("url")}</th><th>{t("status")}</th><th></th></tr>
            </thead>
            <tbody>
              {q.data?.map((h: Hook) => (
                <tr key={h.id} className="border-t border-border/40">
                  <td className="py-2 font-mono text-xs">{h.event}</td>
                  <td className="truncate max-w-[420px]">{h.url}</td>
                  <td>{h.enabled ? t("enabled") : t("disabled")}</td>
                  <td className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => pingHook.mutate(h.id)} disabled={pingHook.isPending}>{t("test")}</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove.mutate(h.id)}>{t("delete")}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataState>
          </Surface>
        </TabsContent>
        <TabsContent value="deliveries" className="space-y-4">
          <Surface>
            <DeliveryStats rows={dq.data ?? []} />
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs text-dim inline-flex items-center gap-2">
                <input type="checkbox" checked={onlyFailed} onChange={(e) => setOnlyFailed(e.target.checked)} />
                {t("failed")}
              </label>
              <Button size="sm" onClick={() => retry.mutate()} disabled={retry.isPending}>
                {t("retryNow")}
              </Button>
            </div>
            <DataState loading={dq.isLoading} error={dq.error}
              empty={!dq.isLoading && (dq.data?.length ?? 0) === 0}
              emptyTitle={t("noDeliveries")} retry={() => dq.refetch()}>
              <table className="w-full text-sm">
                <thead className="text-xs text-dim text-left">
                  <tr>
                    <th className="py-2">{t("event")}</th>
                    <th>{t("status")}</th>
                    <th>{t("attempts")}</th>
                    <th>{t("date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(dq.data ?? []).filter((d) => !onlyFailed || d.failed).map((d: Delivery) => (
                    <tr key={d.id} className="border-t border-border/40">
                      <td className="py-2 font-mono text-xs">{d.event}</td>
                      <td>
                        <span className={d.failed ? "text-destructive" : (d.status ?? 0) >= 200 && (d.status ?? 0) < 400 ? "text-primary" : "text-dim"}>
                          {d.failed ? t("failed") : d.status || "—"}
                        </span>
                      </td>
                      <td className="font-mono text-xs">{d.attempts}</td>
                      <td className="text-xs text-dim">{new Date(d.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataState>
          </Surface>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DeliveryStats({ rows }: { rows: Delivery[] }) {
  const total = rows.length;
  const ok = rows.filter((r) => !r.failed && (r.status ?? 0) >= 200 && (r.status ?? 0) < 400).length;
  const failed = rows.filter((r) => r.failed).length;
  const pending = total - ok - failed;
  const cell = "rounded-md border border-border bg-surface px-3 py-2";
  return (
    <div className="grid grid-cols-4 gap-2 mb-4 text-xs">
      <div className={cell}><div className="text-dim uppercase tracking-widest text-[10px]">Total</div><div className="text-lg font-bold tabular-nums">{total}</div></div>
      <div className={cell}><div className="text-dim uppercase tracking-widest text-[10px]">OK</div><div className="text-lg font-bold tabular-nums text-primary">{ok}</div></div>
      <div className={cell}><div className="text-dim uppercase tracking-widest text-[10px]">Failed</div><div className="text-lg font-bold tabular-nums text-destructive">{failed}</div></div>
      <div className={cell}><div className="text-dim uppercase tracking-widest text-[10px]">Pending</div><div className="text-lg font-bold tabular-nums">{pending}</div></div>
    </div>
  );
}