import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { useBranchId } from "@/lib/store";
import { listApiKeys, createApiKey, revokeApiKey } from "@/lib/api-keys.functions";
import { listTenants } from "@/lib/tenants.functions";

export const Route = createFileRoute("/_authenticated/api-keys")({
  component: ApiKeysPage,
});

function ApiKeysPage() {
  const t = useT();
  const branchId = useBranchId();
  const qc = useQueryClient();
  const tenantsFn = useServerFn(listTenants);
  const listFn = useServerFn(listApiKeys);
  const createFn = useServerFn(createApiKey);
  const revokeFn = useServerFn(revokeApiKey);

  const { data: tenants } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => tenantsFn(),
  });
  const tenantId = tenants?.[0]?.id;

  const { data: keys = [] } = useQuery({
    queryKey: ["api-keys", tenantId],
    queryFn: () => listFn({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });

  const [name, setName] = useState("");
  const [scopeWrite, setScopeWrite] = useState(false);
  const [rate, setRate] = useState(60);
  const [created, setCreated] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          tenantId: tenantId!,
          name: name.trim(),
          scopes: scopeWrite ? ["read", "write"] : ["read"],
          rateLimitPerMin: rate,
        },
      }),
    onSuccess: (r) => {
      setCreated(r.plaintext);
      setName("");
      qc.invalidateQueries({ queryKey: ["api-keys", tenantId] });
      toast.success(t("api_key_created"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => revokeFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys", tenantId] });
      toast.success(t("api_key_revoked"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title={t("api_keys_title")} branchId={branchId ?? undefined}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("api_key_new")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="kname">{t("name")}</Label>
              <Input id="kname" value={name} onChange={(e) => setName(e.target.value)} placeholder="My integration" />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="scope-write"
                type="checkbox"
                checked={scopeWrite}
                onChange={(e) => setScopeWrite(e.target.checked)}
              />
              <Label htmlFor="scope-write">{t("api_key_scope_write")}</Label>
            </div>
            <div>
              <Label htmlFor="krate">{t("api_key_rate_min")}</Label>
              <Input
                id="krate"
                type="number"
                min={1}
                max={6000}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value) || 60)}
              />
            </div>
            <Button
              onClick={() => create.mutate()}
              disabled={!tenantId || !name.trim() || create.isPending}
            >
              {t("create")}
            </Button>
            {created ? (
              <div className="mt-3 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                <div className="mb-1 font-medium">{t("api_key_show_once")}</div>
                <code className="block break-all rounded bg-background p-2 text-xs">{created}</code>
                <Button size="sm" variant="ghost" className="mt-2" onClick={() => setCreated(null)}>
                  {t("dismiss")}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("api_keys_existing")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("api_key_prefix")}</TableHead>
                  <TableHead>{t("api_key_scopes")}</TableHead>
                  <TableHead className="text-end">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell>{k.name}</TableCell>
                    <TableCell className="font-mono text-xs">{k.prefix}…</TableCell>
                    <TableCell>
                      {(k.scopes as string[]).map((s) => (
                        <Badge key={s} variant="secondary" className="mr-1">
                          {s}
                        </Badge>
                      ))}
                    </TableCell>
                    <TableCell className="text-end">
                      {k.revoked_at ? (
                        <Badge variant="outline">{t("revoked")}</Badge>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => revoke.mutate(k.id)}>
                          {t("revoke")}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {keys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      {t("no_data")}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
            <p className="mt-3 text-xs text-muted-foreground">
              {t("api_docs_hint")}{" "}
              <a className="underline" href="/api/public/v1/openapi/json" target="_blank" rel="noreferrer">
                openapi.json
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}