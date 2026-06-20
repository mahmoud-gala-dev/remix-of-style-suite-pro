import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { useCurrentBranch, useData } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { minutesSince } from "@/lib/format";
import { ArrowRight, CheckCircle2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const allQueue = useData((s) => s.queue);
  const queue = allQueue
    .filter((q) => q.branchId === branch.id)
    .slice()
    .sort((a, b) => a.position - b.position);
  const customers = useData((s) => s.customers);
  const updateQueue = useData((s) => s.updateQueue);
  const removeQueue = useData((s) => s.removeQueue);

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
            <AnimatePresence>
              {inProgress.map((q) => {
                const c = customers.find((x) => x.id === q.customerId);
                return (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center justify-between bg-primary/5 border border-primary/30 rounded-lg p-4"
                  >
                    <div>
                      <div className="text-sm font-semibold">{c?.name}</div>
                      <div className="text-[10px] text-dim font-mono mt-0.5">
                        Started {minutesSince(q.createdAt)}m ago
                      </div>
                    </div>
                    <button
                      onClick={() => removeQueue(q.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-success/10 text-success border border-success/30 rounded-md text-[10px] font-bold uppercase tracking-widest"
                    >
                      <CheckCircle2 className="size-3" />
                      {t("completed")}
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {inProgress.length === 0 && <p className="text-xs text-dim">{t("noData")}</p>}
          </div>
        </Surface>

        <Surface>
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-dim mb-4">
            {t("waiting")}
          </h2>
          <div className="space-y-3">
            <AnimatePresence>
              {waiting.map((q, i) => {
                const c = customers.find((x) => x.id === q.customerId);
                return (
                  <motion.div
                    key={q.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20 }}
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
                        onClick={() => updateQueue(q.id, { status: "inProgress" })}
                        className="p-2 rounded-md border border-border hover:border-primary hover:text-primary transition-colors"
                        title="Start"
                      >
                        <ArrowRight className="size-3.5" />
                      </button>
                      <button
                        onClick={() => removeQueue(q.id)}
                        className="p-2 rounded-md border border-border hover:border-destructive hover:text-destructive transition-colors"
                        title="Cancel"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {waiting.length === 0 && <p className="text-xs text-dim">{t("noData")}</p>}
          </div>
        </Surface>
      </div>
    </div>
  );
}
