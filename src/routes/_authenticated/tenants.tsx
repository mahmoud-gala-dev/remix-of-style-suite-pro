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
import { listTenants, upsertTenant, deleteTenant } from "@/lib/tenants.functions";
import { useT } from "@/lib/i18n";

type Tenant = Awaited<ReturnType<typeof listTenants>>[number];

export const Route = createFileRoute("/_authenticated/tenants")({
  ssr: false,
  head: () => ({ meta: [{ title: "Tenants" }] }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});

function Page() {
  const t = useT();
  const fetchTenants = useServerFn(listTenants);
  const save = useServerFn(upsertTenant);
  const del = useServerFn(deleteTenant);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["tenants"], queryFn: () => fetchTenants() });
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["tenants"] });

  const add = useMutation({
    mutationFn: () => save({ data: { name } }),
    onSuccess: () => { setName(""); invalidate(); toast.success(t("save")); },
    onError: (e: Error) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: (v: { id: string; name: string }) => save({ data: v }),
    onSuccess: () => { setEditingId(null); invalidate(); toast.success(t("save")); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success(t("removed")); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-8 max-w-[1100px] mx-auto space-y-6">
      <PageHeader title={t("tenants")} subtitle={t("switchTenant")} />
      <Surface>
        <div className="flex gap-2 items-end">
          <label className="space-y-1.5 text-xs flex-1">
            <span className="text-dim">{t("tenantName")}</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("newTenant")} />
          </label>
          <Button onClick={() => add.mutate()} disabled={!name.trim() || add.isPending}>{t("add")}</Button>
        </div>
      </Surface>
      <Surface>
        <DataState
          loading={q.isLoading}
          error={q.error}
          empty={!q.isLoading && (q.data?.length ?? 0) === 0}
          emptyTitle={t("noTenants")}
          retry={() => q.refetch()}
        >
          <table className="w-full text-sm">
            <thead className="text-xs text-dim text-left">
              <tr><th className="py-2">{t("tenantName")}</th><th></th></tr>
            </thead>
            <tbody>
              {q.data?.map((tn: Tenant) => (
                <tr key={tn.id} className="border-t border-border/40">
                  <td className="py-2">
                    {editingId === tn.id ? (
                      <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} />
                    ) : (
                      <span>{tn.name}</span>
                    )}
                  </td>
                  <td className="text-right space-x-1">
                    {editingId === tn.id ? (
                      <>
                        <Button size="sm" onClick={() => update.mutate({ id: tn.id, name: editingName })}
                          disabled={!editingName.trim() || update.isPending}>{t("save")}</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>{t("cancel")}</Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => { setEditingId(tn.id); setEditingName(tn.name); }}>
                          {t("edit")}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                          if (confirm(t("deleteTenantConfirm"))) remove.mutate(tn.id);
                        }}>{t("delete")}</Button>
                      </>
                    )}
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