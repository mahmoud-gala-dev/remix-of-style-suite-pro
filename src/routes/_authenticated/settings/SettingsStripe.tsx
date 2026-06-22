import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Surface } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { getStripeSettings, updateStripeSettings } from "@/lib/stripe.functions";
import { useT } from "@/lib/i18n";

export function SettingsStripe() {
  const t = useT();
  const fetchCfg = useServerFn(getStripeSettings);
  const saveCfg = useServerFn(updateStripeSettings);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["stripe-settings"], queryFn: () => fetchCfg() });

  const [enabled, setEnabled] = useState(false);
  const [secretKey, setSecretKey] = useState("");
  const [publishableKey, setPublishableKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [pricePerBranch, setPricePerBranch] = useState(29);
  const [successUrl, setSuccessUrl] = useState("/settings");
  const [cancelUrl, setCancelUrl] = useState("/settings");

  useEffect(() => {
    if (q.data) {
      setEnabled(q.data.enabled);
      setPublishableKey(q.data.publishable_key);
      setPricePerBranch(q.data.price_per_branch_usd);
      setSuccessUrl(q.data.success_url);
      setCancelUrl(q.data.cancel_url);
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: () =>
      saveCfg({
        data: {
          enabled,
          secret_key: secretKey,
          publishable_key: publishableKey,
          webhook_secret: webhookSecret,
          price_per_branch_usd: pricePerBranch,
          success_url: successUrl,
          cancel_url: cancelUrl,
        },
      }),
    onSuccess: () => {
      toast.success(t("stripeSettingsSaved"));
      setSecretKey("");
      setWebhookSecret("");
      qc.invalidateQueries({ queryKey: ["stripe-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Surface>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-widest">Stripe Billing</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-dim">{enabled ? t("active") : t("inactive")}</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>
      <p className="text-xs text-dim mb-4">
        Off by default. Enable to charge per branch via Stripe Checkout.
        Keys are stored server-side and never exposed to the browser.
      </p>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-dim mb-1.5">Secret Key (sk_live_… / sk_test_…)</label>
          <Input
            type="password"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder={q.data?.secret_key ? "•••••••• (leave blank to keep)" : "sk_…"}
          />
        </div>
        <div>
          <label className="block text-xs text-dim mb-1.5">Publishable Key (pk_…)</label>
          <Input
            value={publishableKey}
            onChange={(e) => setPublishableKey(e.target.value)}
            placeholder="pk_…"
          />
        </div>
        <div>
          <label className="block text-xs text-dim mb-1.5">Webhook Secret (whsec_…)</label>
          <Input
            type="password"
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            placeholder={q.data?.webhook_secret ? "•••••••• (leave blank to keep)" : "whsec_…"}
          />
        </div>
        <div>
          <label className="block text-xs text-dim mb-1.5">Price per branch (USD)</label>
          <Input
            type="number"
            value={pricePerBranch}
            onChange={(e) => setPricePerBranch(Number(e.target.value) || 0)}
            min={0}
            max={9999}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-dim mb-1.5">Success URL path</label>
            <Input value={successUrl} onChange={(e) => setSuccessUrl(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-dim mb-1.5">Cancel URL path</label>
            <Input value={cancelUrl} onChange={(e) => setCancelUrl(e.target.value)} />
          </div>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? t("saving") : t("save")}
        </Button>
      </div>
    </Surface>
  );
}
