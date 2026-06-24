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
import { Textarea } from "@/components/ui/textarea";
import { useCurrentBranch } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Plus, Send, Trash2, Ban } from "lucide-react";
import { RouteError, RouteNotFound } from "@/components/shell/route-error";
import {
  listCampaigns, createCampaign, launchCampaign, cancelCampaign, deleteCampaign,
} from "@/lib/campaigns.functions";

export const Route = createFileRoute("/_authenticated/campaigns")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  ssr: false,
  head: () => ({ meta: [{ title: "Campaigns" }] }),
  component: () => (<AppShell><Page /></AppShell>),
});

type Channel = "whatsapp" | "email" | "push";
type Segment = "all" | "vip" | "inactive_30d" | "birthdays_this_month" | "custom";

function Page() {
  const t = useT();
  const branch = useCurrentBranch();
  const qc = useQueryClient();
  const list = useServerFn(listCampaigns);
  const createFn = useServerFn(createCampaign);
  const launchFn = useServerFn(launchCampaign);
  const cancelFn = useServerFn(cancelCampaign);
  const deleteFn = useServerFn(deleteCampaign);

  const q = useQuery({
    queryKey: ["campaigns", branch.id],
    queryFn: () => list({ data: { branchId: branch.id } }),
    enabled: !!branch.id,
  });

  const [name, setName] = useState("");
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [segment, setSegment] = useState<Segment>("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("Hi {name}, ");
  const reset = () => { setName(""); setSubject(""); setBody("Hi {name}, "); };

  const createMut = useMutation({
    mutationFn: () => createFn({ data: {
      branchId: branch.id, name, channel, segment,
      subject: subject || undefined, body,
    }}),
    onSuccess: (r) => {
      toast.success(`Created (${r.recipientCount} recipients)`);
      reset();
      qc.invalidateQueries({ queryKey: ["campaigns", branch.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const launchMut = useMutation({
    mutationFn: (id: string) => launchFn({ data: { id } }),
    onSuccess: (r) => { toast.success(`Queued ${r.queued} messages`); qc.invalidateQueries({ queryKey: ["campaigns", branch.id] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelFn({ data: { id } }),
    onSuccess: () => { toast.success("Cancelled"); qc.invalidateQueries({ queryKey: ["campaigns", branch.id] }); },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["campaigns", branch.id] }); },
  });

  const rows = q.data ?? [];

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader title={t("campaigns")} subtitle={`${rows.length} total`} />

      <Surface>
        <h3 className="text-sm font-bold uppercase tracking-widest mb-4">New campaign</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex gap-2">
            <select value={channel} onChange={(e) => setChannel(e.target.value as Channel)}
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm">
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="push">Push</option>
            </select>
            <select value={segment} onChange={(e) => setSegment(e.target.value as Segment)}
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm">
              <option value="all">All customers</option>
              <option value="vip">VIP (5+ visits or 1000+ spend)</option>
              <option value="inactive_30d">Inactive 30+ days</option>
              <option value="birthdays_this_month">Birthdays this month</option>
            </select>
          </div>
          {channel === "email" || channel === "push" ? (
            <Input className="md:col-span-2" placeholder="Subject / Title"
              value={subject} onChange={(e) => setSubject(e.target.value)} />
          ) : null}
          <Textarea className="md:col-span-2" rows={4} value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message body. Use {name} to insert customer name." />
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={() => createMut.mutate()}
            disabled={!name || !body || createMut.isPending}>
            <Plus className="size-4 me-1" /> {createMut.isPending ? "Creating…" : "Create draft"}
          </Button>
        </div>
      </Surface>

      <DataState loading={q.isLoading} error={q.error}
        empty={!q.isLoading && rows.length === 0} emptyTitle="No campaigns yet"
        retry={() => q.refetch()}>
        <Surface padded={false} className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-2/40 text-[10px] uppercase tracking-widest text-dim">
              <tr>
                <th className="text-start px-4 py-3">Name</th>
                <th className="text-start px-4 py-3">Channel</th>
                <th className="text-start px-4 py-3">Segment</th>
                <th className="text-start px-4 py-3">Status</th>
                <th className="text-start px-4 py-3">Sent / Failed / Total</th>
                <th className="text-end px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">{c.channel}</td>
                  <td className="px-4 py-3">{c.segment}</td>
                  <td className="px-4 py-3"><span className="text-xs uppercase tracking-wider">{c.status}</span></td>
                  <td className="px-4 py-3 font-mono">{c.sent_count} / {c.failed_count} / {c.recipient_count}</td>
                  <td className="px-4 py-3 text-end space-x-2">
                    {(c.status === "draft" || c.status === "scheduled") && (
                      <Button size="sm" variant="outline" onClick={() => launchMut.mutate(c.id)} disabled={launchMut.isPending}>
                        <Send className="size-3.5 me-1" /> Launch
                      </Button>
                    )}
                    {(c.status === "draft" || c.status === "scheduled" || c.status === "sending") && (
                      <Button size="sm" variant="ghost" onClick={() => cancelMut.mutate(c.id)}>
                        <Ban className="size-3.5 me-1" /> Cancel
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => delMut.mutate(c.id)}>
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
