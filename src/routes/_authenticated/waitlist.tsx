import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/shell/page";
import { DataState } from "@/components/shell/data-state";
import { useCurrentBranch } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { listWaitlist, updateWaitlistStatus, deleteWaitlistEntry } from "@/lib/waitlist.functions";
import { waLink, buildWaitlistOpenSlotMsg } from "@/lib/whatsapp";
import { MessageCircle, Trash2, Check, Bell } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/waitlist")({
  ssr: false,
  head: () => ({ meta: [{ title: "Waitlist" }] }),
  component: () => (<AppShell><Page /></AppShell>),
});

function Page() {
  const t = useT();
  const branch = useCurrentBranch();
  const qc = useQueryClient();
  const list = useServerFn(listWaitlist);
  const updateFn = useServerFn(updateWaitlistStatus);
  const deleteFn = useServerFn(deleteWaitlistEntry);

  const q = useQuery({
    queryKey: ["waitlist", branch.id],
    queryFn: () => list({ data: { branchId: branch.id } }),
  });

  const updMut = useMutation({
    mutationFn: (v: { id: string; status: "waiting" | "notified" | "converted" | "cancelled" }) =>
      updateFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["waitlist", branch.id] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["waitlist", branch.id] }),
  });

  const rows = q.data ?? [];
  const bookUrl = typeof window !== "undefined" ? `${window.location.origin}/book` : "/book";

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Waitlist" subtitle={`${rows.length} ${rows.length === 1 ? "entry" : "entries"}`} />
      <DataState
        loading={q.isLoading}
        error={q.error}
        empty={!q.isLoading && rows.length === 0}
        emptyTitle={t("noData")}
        retry={() => q.refetch()}
      >
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-start p-3">Customer</th>
                <th className="text-start p-3">Phone</th>
                <th className="text-start p-3">Preferred</th>
                <th className="text-start p-3">Status</th>
                <th className="text-start p-3">Created</th>
                <th className="text-end p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const msg = buildWaitlistOpenSlotMsg({
                  customerName: r.customer_name,
                  branchName: branch.nameEn ?? "",
                  serviceName: "your selected service",
                  bookingUrl: bookUrl,
                });
                return (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 font-medium">{r.customer_name}</td>
                    <td className="p-3 font-mono text-xs">{r.customer_phone}</td>
                    <td className="p-3 text-muted-foreground">{r.preferred_date ?? "—"}</td>
                    <td className="p-3">
                      <span className="inline-block rounded-full px-2 py-0.5 text-xs bg-muted">{r.status}</span>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <a href={waLink(r.customer_phone, msg)} target="_blank" rel="noopener noreferrer"
                          title="WhatsApp" className="p-2 rounded-md hover:bg-accent">
                          <MessageCircle className="size-4" />
                        </a>
                        <button title="Mark notified" onClick={() => updMut.mutate({ id: r.id, status: "notified" })}
                          className="p-2 rounded-md hover:bg-accent">
                          <Bell className="size-4" />
                        </button>
                        <button title="Converted" onClick={() => updMut.mutate({ id: r.id, status: "converted" })}
                          className="p-2 rounded-md hover:bg-accent text-primary">
                          <Check className="size-4" />
                        </button>
                        <button title="Delete" onClick={() => delMut.mutate(r.id)}
                          className="p-2 rounded-md hover:bg-accent text-destructive">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DataState>
    </div>
  );
}