import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { DataState } from "@/components/shell/data-state";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { listStaffAccess, setUserBranches } from "@/lib/access.functions";
import { useI18n, useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/access")({
  ssr: false,
  head: () => ({ meta: [{ title: "Access Control" }] }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});

function Page() {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const fetchAccess = useServerFn(listStaffAccess);
  const saveBranches = useServerFn(setUserBranches);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["access"], queryFn: () => fetchAccess() });

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader title={t("accessControl")} subtitle={t("assignBranchesToStaff")} />
      <Surface>
        <DataState
          loading={q.isLoading}
          error={q.error}
          empty={!q.isLoading && (q.data?.users.length ?? 0) === 0}
          emptyTitle="No staff accounts yet"
          retry={() => q.refetch()}
        >
          {q.data && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-dim border-b border-border">
                    <th className="py-3 pr-4">User</th>
                    <th className="py-3 pr-4">Roles</th>
                    {q.data.branches.map((b) => (
                      <th key={b.id} className="py-3 px-2 text-center">
                        {lang === "ar" ? b.name_ar : b.name_en}
                      </th>
                    ))}
                    <th className="py-3 pl-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.users.map((u) => (
                    <UserRow
                      key={u.userId}
                      user={u}
                      branches={q.data!.branches}
                      onSave={async (branchIds) => {
                        try {
                          await saveBranches({ data: { userId: u.userId, branchIds } });
                          toast.success("Saved");
                          qc.invalidateQueries({ queryKey: ["access"] });
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Save failed");
                        }
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DataState>
      </Surface>
    </div>
  );
}

function UserRow({
  user,
  branches,
  onSave,
}: {
  user: { userId: string; email: string; roles: string[]; branchIds: string[] };
  branches: { id: string; name_en: string; name_ar: string }[];
  onSave: (ids: string[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(user.branchIds));
  useEffect(() => setSelected(new Set(user.branchIds)), [user.branchIds]);
  const dirty = selected.size !== user.branchIds.length || [...selected].some((id) => !user.branchIds.includes(id));
  const save = useMutation({ mutationFn: () => onSave([...selected]) });

  return (
    <tr className="border-b border-border/50">
      <td className="py-3 pr-4">
        <div className="text-foreground">{user.email || "—"}</div>
        <div className="text-xs text-dim font-mono">{user.userId.slice(0, 8)}</div>
      </td>
      <td className="py-3 pr-4 text-xs text-dim">{user.roles.join(", ") || "—"}</td>
      {branches.map((b) => (
        <td key={b.id} className="py-3 px-2 text-center">
          <Checkbox
            checked={selected.has(b.id)}
            onCheckedChange={(v) => {
              const next = new Set(selected);
              if (v) next.add(b.id);
              else next.delete(b.id);
              setSelected(next);
            }}
          />
        </td>
      ))}
      <td className="py-3 pl-4 text-right">
        <Button size="sm" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
      </td>
    </tr>
  );
}