import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { useCurrentBranch, useData } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/push";
import { useServerFn } from "@tanstack/react-start";
import { broadcastPush } from "@/lib/push.functions";
import { minutesSince } from "@/lib/format";
import { ArrowRight, CheckCircle2, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/queue")({
  ssr: false,
  head: () => ({ meta: [{ title: "Live Queue" }] }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});

function Page() {
  const t = useT();
  const branch = useCurrentBranch();
  const qc = useQueryClient();
  const broadcast = useServerFn(broadcastPush);
  useEffect(() => {
    const ch = supabase
      .channel("realtime:queue_items")
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_items" }, () => {
        qc.invalidateQueries({ queryKey: ["queue"] });
        qc.invalidateQueries({ queryKey: ["hydrate"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);
  const allQueue = useData((s) => s.queue);
  const queue = allQueue
    .filter((q) => q.branchId === branch.id)
    .slice()
    .sort((a, b) => a.position - b.position);
  const customers = useData((s) => s.customers);
  const updateQueue = useData((s) => s.updateQueue);
  const removeQueue = useData((s) => s.removeQueue);

  const startServing = async (id: string) => {
    const item = allQueue.find((q) => q.id === id);
    const c = customers.find((x) => x.id === item?.customerId);
    updateQueue(id, { status: "inProgress" });
    await supabase.from("queue_items").update({ status: "in_progress" }).eq("id", id);
    notify(t("nextCustomer"), c?.name ? `${c.name} — ${t("pleaseComeIn")}` : t("callingNext"));
    void broadcast({
      data: {
        title: t("nextCustomer"),
        body: c?.name ? `${c.name} — ${t("pleaseComeIn")}` : t("callingNext"),
        url: "/queue",
        tag: `queue-${id}`,
      },
    }).catch(() => {});
  };
  const completeOrCancel = async (id: string) => {
    removeQueue(id);
    await supabase.from("queue_items").delete().eq("id", id);
  };

  const waiting = queue.filter((q) => q.status === "waiting" || q.status === "called");
  const inProgress = queue.filter((q) => q.status === "inProgress");

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      <PageHeader
        title={t("liveQueue")}
        subtitle={`${waiting.length} ${t("waiting")} · ${inProgress.length} ${t("inProgress")}`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Surface>
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-4">
            {t("inProgress")}
          </h2>
          <div className="space-y-3">
            {inProgress.map((q) => {
                const c = customers.find((x) => x.id === q.customerId);
                return (
                  <div
                    key={q.id}
                    className="flex items-center justify-between bg-primary/5 border border-primary/30 rounded-lg p-4"
                  >
                    <div>
                      <div className="text-sm font-semibold">{c?.name}</div>
                      <div className="text-[10px] text-dim font-mono mt-0.5">
                        {t("startedMinAgo").replace("{n}", String(minutesSince(q.createdAt)))}
                      </div>
                    </div>
                    <button
                      onClick={() => completeOrCancel(q.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-success/10 text-success border border-success/30 rounded-md text-[10px] font-bold uppercase tracking-widest"
                    >
                      <CheckCircle2 className="size-3" />
                      {t("completed")}
                    </button>
                  </div>
                );
              })}
            {inProgress.length === 0 && <p className="text-xs text-dim">{t("noData")}</p>}
          </div>
        </Surface>

        <Surface>
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-dim mb-4">
            {t("waiting")}
          </h2>
          <div className="space-y-3">
            {waiting.map((q, i) => {
                const c = customers.find((x) => x.id === q.customerId);
                return (
                  <div
                    key={q.id}
                    className="flex items-center justify-between bg-background border border-border rounded-lg p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-surface-2 grid place-items-center text-xs font-bold">
                        #{i + 1}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{c?.name}</div>
                        <div className="text-[10px] text-dim font-mono">
                          {minutesSince(q.createdAt)}m
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => startServing(q.id)}
                        className="p-2 rounded-md border border-border hover:border-primary hover:text-primary transition-colors"
                        title={t("start")}
                      >
                        <ArrowRight className="size-3.5" />
                      </button>
                      <button
                        onClick={() => completeOrCancel(q.id)}
                        className="p-2 rounded-md border border-border hover:border-destructive hover:text-destructive transition-colors"
                        title={t("cancel")}
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            {waiting.length === 0 && <p className="text-xs text-dim">{t("noData")}</p>}
          </div>
        </Surface>
      </div>
    </div>
  );
}
