import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Surface } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { getTenantUsage } from "@/lib/billing.functions";
import { createStripeCheckout } from "@/lib/stripe.functions";
import { getStripeSettings } from "@/lib/stripe.functions";
import { useData } from "@/lib/store";
import { useT } from "@/lib/i18n";

export function SettingsBilling() {
  const t = useT();
  const tenantId = useData((s) => s.currentTenantId);
  const branches = useData((s) => s.branches);
  const currentTenantBranches = branches.filter((b) => b.tenantId === tenantId);
  const branchCount = currentTenantBranches.length;

  const fetchUsage = useServerFn(getTenantUsage);
  const fetchStripeCfg = useServerFn(getStripeSettings);
  const createCheckout = useServerFn(createStripeCheckout);

  const q = useQuery({
    queryKey: ["tenant-usage", tenantId],
    queryFn: () => fetchUsage({ data: { tenant_id: tenantId! } }),
    enabled: !!tenantId,
  });

  const stripeQ = useQuery({
    queryKey: ["stripe-settings"],
    queryFn: () => fetchStripeCfg(),
    enabled: !!tenantId,
  });

  const checkoutMut = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error(t("noTenantSelected"));
      return createCheckout({ data: { tenant_id: tenantId, branch_count: branchCount } });
    },
    onSuccess: (r) => {
      if (r.url) window.location.href = r.url;
    },
    onError: (e: Error) => {
      // Stripe not enabled → silent fail; show inline message
      console.warn("Checkout error:", e.message);
    },
  });

  if (!tenantId) {
    return (
      <Surface>
        <h3 className="text-sm font-bold uppercase tracking-widest mb-2">{t("billing")}</h3>
        <p className="text-xs text-dim">{t("selectTenantBilling")}</p>
      </Surface>
    );
  }
  if (q.isLoading) {
    return <Surface><p className="text-xs text-dim">{t("loading")}</p></Surface>;
  }
  if (q.error || !q.data) {
    return <Surface><p className="text-xs text-destructive">{q.error?.message ?? t("noSubscription")}</p></Surface>;
  }

  const { used, limit, remaining, over_limit, subscription } = q.data;
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const pricePerBranch = stripeQ.data?.price_per_branch_usd ?? 29;
  const stripeEnabled = stripeQ.data?.enabled ?? false;
  const monthly = branchCount * pricePerBranch;

  return (
    <Surface>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold uppercase tracking-widest">{t("billing")}</h3>
        <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm bg-primary/10 text-primary">
          {subscription?.tier ?? "free"}
        </span>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-dim">{t("bookingsThisPeriod")}</span>
          <span className="font-mono">{used} / {limit}</span>
        </div>
        <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
          <div
            className={`h-full transition-all ${over_limit ? "bg-destructive" : pct > 80 ? "bg-amber-500" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {over_limit && (
          <p className="text-xs text-destructive">
            {t("planLimitReached")}
          </p>
        )}
        <p className="text-[10px] text-dim">{remaining} {t("remaining")}</p>

        <div className="pt-3 border-t border-border">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-dim">{t("branches")}: {branchCount}</span>
            <span className="font-mono">${pricePerBranch} {t("perBranchMo")}</span>
          </div>
          <div className="flex justify-between text-xs font-medium mb-3">
            <span>{t("estimatedMonthly")}</span>
            <span className="font-mono">${monthly}/mo</span>
          </div>
          {stripeEnabled ? (
            <Button
              size="sm"
              className="w-full"
              onClick={() => checkoutMut.mutate()}
              disabled={checkoutMut.isPending}
            >
              {checkoutMut.isPending ? t("loading") : t("upgradeNow")}
            </Button>
          ) : (
            <p className="text-[10px] text-dim">
              {t("stripeBillingDisabled")}
            </p>
          )}
        </div>
      </div>
    </Surface>
  );
}
