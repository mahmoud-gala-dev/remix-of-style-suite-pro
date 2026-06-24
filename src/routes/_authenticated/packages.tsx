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
import { Plus, Trash2, Package as PackageIcon } from "lucide-react";
import { RouteError, RouteNotFound } from "@/components/shell/route-error";
import {
  listPackages, createPackage, togglePackageActive, deletePackage,
} from "@/lib/packages.functions";

export const Route = createFileRoute("/_authenticated/packages")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  ssr: false,
  head: () => ({ meta: [{ title: "Service Packages" }] }),
  component: () => (<AppShell><Page /></AppShell>),
});

function Page() {
  const t = useT();
  const branch = useCurrentBranch();
  const qc = useQueryClient();
  const list = useServerFn(listPackages);
  const createFn = useServerFn(createPackage);
  const toggleFn = useServerFn(togglePackageActive);
  const delFn = useServerFn(deletePackage);

  const q = useQuery({
    queryKey: ["service_packages", branch.id],
    queryFn: () => list({ data: { branchId: branch.id } }),
  });

  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [sessions, setSessions] = useState("10");
  const [price, setPrice] = useState("");
  const [validityDays, setValidityDays] = useState("365");
  const [description, setDescription] = useState("");

  const createMut = useMutation({
    mutationFn: () => createFn({ data: {
      branchId: branch.id,
      nameEn, nameAr,
      description: description || undefined,
      serviceIds: [],
      sessionsCount: Number(sessions),
      price: Number(price),
      currency: "SAR",
      validityDays: Number(validityDays),
    }}),
    onSuccess: () => {
      toast.success("Package created");
      setNameEn(""); setNameAr(""); setSessions("10"); setPrice("");
      setValidityDays("365"); setDescription("");
      qc.invalidateQueries({ queryKey: ["service_packages", branch.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => toggleFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service_packages", branch.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["service_packages", branch.id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = q.data ?? [];

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader title={t("packages")} subtitle={`${rows.length} total`} />

      <Surface>
        <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Create package</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <Input placeholder="Name (English)" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
          <Input placeholder="الاسم (عربي)" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
          <div />
          <Input type="number" min={1} placeholder="Sessions count" value={sessions} onChange={(e) => setSessions(e.target.value)} />
          <Input type="number" min={0} placeholder="Price (SAR)" value={price} onChange={(e) => setPrice(e.target.value)} />
          <Input type="number" min={1} placeholder="Validity (days)" value={validityDays} onChange={(e) => setValidityDays(e.target.value)} />
          <Textarea className="md:col-span-2 lg:col-span-3" rows={2} placeholder="Description (optional)"
            value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={() => createMut.mutate()}
            disabled={!nameEn || !nameAr || !sessions || !price || createMut.isPending}>
            <Plus className="size-4 me-1" /> {createMut.isPending ? "Creating…" : "Create"}
          </Button>
        </div>
      </Surface>

      <DataState loading={q.isLoading} error={q.error}
        empty={!q.isLoading && rows.length === 0} emptyTitle="No packages yet"
        retry={() => q.refetch()}>
        <Surface padded={false} className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-2/40 text-[10px] uppercase tracking-widest text-dim">
              <tr>
                <th className="text-start px-4 py-3">Name</th>
                <th className="text-start px-4 py-3">Sessions</th>
                <th className="text-start px-4 py-3">Price</th>
                <th className="text-start px-4 py-3">Validity</th>
                <th className="text-start px-4 py-3">Active</th>
                <th className="text-end px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <PackageIcon className="size-4 text-dim" />
                      <div>
                        <div className="font-medium">{p.name_en}</div>
                        <div className="text-xs text-dim">{p.name_ar}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono">{p.sessions_count}</td>
                  <td className="px-4 py-3 font-mono">{p.price} {p.currency}</td>
                  <td className="px-4 py-3">{p.validity_days}d</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant={p.active ? "default" : "outline"}
                      onClick={() => toggleMut.mutate({ id: p.id, active: !p.active })}>
                      {p.active ? "Active" : "Inactive"}
                    </Button>
                  </td>
                  <td className="px-4 py-3 text-end">
                    <Button size="sm" variant="ghost" className="text-red-500"
                      onClick={() => delMut.mutate(p.id)}>
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