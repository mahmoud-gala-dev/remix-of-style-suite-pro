import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Surface } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { getSAMLSettings, updateSAMLSettings } from "@/lib/saml.functions";
import { useT } from "@/lib/i18n";

export function SettingsSAML() {
  const t = useT();
  const fetchCfg = useServerFn(getSAMLSettings);
  const saveCfg = useServerFn(updateSAMLSettings);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["saml-settings"], queryFn: () => fetchCfg() });

  const [enabled, setEnabled] = useState(false);
  const [metadataUrl, setMetadataUrl] = useState("");
  const [domains, setDomains] = useState("");

  useEffect(() => {
    if (q.data) {
      setEnabled(q.data.enabled);
      setMetadataUrl(q.data.metadata_url);
      setDomains(q.data.domains.join(", "));
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: () =>
      saveCfg({
        data: {
          enabled,
          metadata_url: metadataUrl,
          domains: domains.split(",").map((d) => d.trim()).filter(Boolean),
        },
      }),
    onSuccess: () => {
      toast.success(t("samlSettingsSaved"));
      qc.invalidateQueries({ queryKey: ["saml-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Surface>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-widest">SAML SSO</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-dim">{enabled ? t("active") : t("inactive")}</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>
      <p className="text-xs text-dim mb-4">
        Off by default. Enable SAML 2.0 single sign-on for your organization.
        Configure your Identity Provider metadata and allowed email domains.
      </p>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-dim mb-1.5">IdP Metadata URL</label>
          <Input
            value={metadataUrl}
            onChange={(e) => setMetadataUrl(e.target.value)}
            placeholder="https://idp.example.com/metadata"
          />
        </div>
        <div>
          <label className="block text-xs text-dim mb-1.5">Allowed Domains (comma-separated)</label>
          <Input
            value={domains}
            onChange={(e) => setDomains(e.target.value)}
            placeholder="example.com, corp.example.com"
          />
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? t("saving") : t("save")}
        </Button>
      </div>
    </Surface>
  );
}
