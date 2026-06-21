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
import { listWebhooks, upsertWebhook, deleteWebhook } from "@/lib/webhooks.functions";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/webhooks")({
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
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["webhooks"], queryFn: () => fetchHooks() });
  const [event, setEvent] = useState("booking.created");
  const [url, setUrl] = useState("");

  const add = useMutation({
    mutationFn: () => saveHook({ data: { event, url, enabled: true } }),
    onSuccess: () => { toast.success(t("webhookAdded")); setUrl(""); qc.invalidateQueries({ queryKey: ["webhooks"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("failed")),
  });
  const remove = useMutation({
    mutationFn: (id: string) => delHook({ data: { id } }),
    onSuccess: () => { toast.success(t("removed")); qc.invalidateQueries({ queryKey: ["webhooks"] }); },
  });

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-6">
      <PageHeader title={t("webhooks")} subtitle={t("webhooksSubtitle")} />
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
              {q.data?.map((h: any) => (
                <tr key={h.id} className="border-t border-border/40">
                  <td className="py-2 font-mono text-xs">{h.event}</td>
                  <td className="truncate max-w-[420px]">{h.url}</td>
                  <td>{h.enabled ? t("enabled") : t("disabled")}</td>
                  <td className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => remove.mutate(h.id)}>{t("delete")}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataState>
      </Surface>
    </div>
  );
}