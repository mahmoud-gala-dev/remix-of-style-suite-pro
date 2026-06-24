import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { useCurrentBranch } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { RouteError, RouteNotFound } from "@/components/shell/route-error";
import { Save } from "lucide-react";
import {
  SUPPORTED_CURRENCIES, getTenantCurrency, setTenantCurrency,
} from "@/lib/currency.functions";

export const Route = createFileRoute("/_authenticated/currency")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  ssr: false,
  head: () => ({ meta: [{ title: "Currency" }] }),
  component: () => (<AppShell><Page /></AppShell>),
});

function Page() {
  const t = useT();
  const branch = useCurrentBranch();
  const qc = useQueryClient();
  const getFn = useServerFn(getTenantCurrency);
  const setFn = useServerFn(setTenantCurrency);

  const curQ = useQuery({
    queryKey: ["tenant_currency", branch.id],
    queryFn: () => getFn({ data: { branchId: branch.id } }),
  });

  const [code, setCode] = useState<string>("SAR");
  useEffect(() => { if (curQ.data) setCode(curQ.data); }, [curQ.data]);

  const saveMut = useMutation({
    mutationFn: () => setFn({ data: { branchId: branch.id, currency: code } }),
    onSuccess: () => {
      toast.success(t("currency_saved"));
      qc.invalidateQueries({ queryKey: ["tenant_currency", branch.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <PageHeader title={t("currency")} subtitle={t("currency_sub")} />
      <Surface>
        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-dim block mb-2">
              {t("default_currency")}
            </label>
            <select className="bg-surface-2 border border-border rounded-md px-3 py-2 text-sm w-full"
              value={code} onChange={(e) => setCode(e.target.value)}>
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name} ({c.symbol})
                </option>
              ))}
            </select>
          </div>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            <Save className="size-4 me-1" /> {saveMut.isPending ? "…" : t("save")}
          </Button>
        </div>
      </Surface>
      <Surface>
        <h3 className="text-sm font-bold uppercase tracking-widest mb-3">{t("supported_currencies")}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          {SUPPORTED_CURRENCIES.map((c) => (
            <div key={c.code} className="px-3 py-2 border border-border rounded-md">
              <span className="font-mono">{c.code}</span> · {c.symbol}
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}