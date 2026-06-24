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
import { useCurrentBranch } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Plus, CheckCircle2, Search } from "lucide-react";
import { RouteError, RouteNotFound } from "@/components/shell/route-error";
import {
  listReferralCodes, issueReferralCode, redeemReferralCode,
  completeReferral, listReferrals,
} from "@/lib/referrals.functions";

export const Route = createFileRoute("/_authenticated/referrals")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  ssr: false,
  head: () => ({ meta: [{ title: "Referrals" }] }),
  component: () => (<AppShell><Page /></AppShell>),
});

function Page() {
  const t = useT();
  const branch = useCurrentBranch();
  const qc = useQueryClient();
  const codesList = useServerFn(listReferralCodes);
  const refsList = useServerFn(listReferrals);
  const issueFn = useServerFn(issueReferralCode);
  const redeemFn = useServerFn(redeemReferralCode);
  const completeFn = useServerFn(completeReferral);

  const codesQ = useQuery({
    queryKey: ["referral_codes", branch.id],
    queryFn: () => codesList({ data: { branchId: branch.id } }),
  });
  const refsQ = useQuery({
    queryKey: ["referrals", branch.id],
    queryFn: () => refsList({ data: { branchId: branch.id } }),
  });

  const [customerId, setCustomerId] = useState("");
  const [refReward, setRefReward] = useState("20");
  const [refeeReward, setRefeeReward] = useState("10");

  const [code, setCode] = useState("");
  const [refereeId, setRefereeId] = useState("");

  const issueMut = useMutation({
    mutationFn: () => issueFn({ data: {
      branchId: branch.id,
      customerId,
      referrerReward: Number(refReward),
      refereeReward: Number(refeeReward),
      rewardType: "credit",
    }}),
    onSuccess: (r) => {
      toast.success(`Code: ${r.code}`);
      setCustomerId("");
      qc.invalidateQueries({ queryKey: ["referral_codes", branch.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const redeemMut = useMutation({
    mutationFn: () => redeemFn({ data: { code: code.trim(), refereeCustomerId: refereeId } }),
    onSuccess: () => {
      toast.success("Referral registered");
      setCode(""); setRefereeId("");
      qc.invalidateQueries({ queryKey: ["referrals", branch.id] });
      qc.invalidateQueries({ queryKey: ["referral_codes", branch.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const completeMut = useMutation({
    mutationFn: (id: string) => completeFn({ data: { id } }),
    onSuccess: () => { toast.success("Marked completed"); qc.invalidateQueries({ queryKey: ["referrals", branch.id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const codes = codesQ.data ?? [];
  const refs = refsQ.data ?? [];

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader title={t("referrals")} subtitle={`${codes.length} codes • ${refs.length} referrals`} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Surface>
          <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Issue code</h3>
          <div className="space-y-3">
            <Input placeholder="Customer ID (UUID)" value={customerId}
              onChange={(e) => setCustomerId(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" min={0} placeholder="Referrer reward"
                value={refReward} onChange={(e) => setRefReward(e.target.value)} />
              <Input type="number" min={0} placeholder="Referee reward"
                value={refeeReward} onChange={(e) => setRefeeReward(e.target.value)} />
            </div>
            <Button onClick={() => issueMut.mutate()}
              disabled={!customerId || issueMut.isPending} className="w-full">
              <Plus className="size-4 me-1" /> {issueMut.isPending ? "Issuing…" : "Generate code"}
            </Button>
          </div>
        </Surface>

        <Surface>
          <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Redeem code</h3>
          <div className="space-y-3">
            <Input placeholder="Referral code" value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())} />
            <Input placeholder="New customer ID (UUID)" value={refereeId}
              onChange={(e) => setRefereeId(e.target.value)} />
            <Button onClick={() => redeemMut.mutate()}
              disabled={!code || !refereeId || redeemMut.isPending} className="w-full">
              <Search className="size-4 me-1" /> {redeemMut.isPending ? "Redeeming…" : "Apply"}
            </Button>
          </div>
        </Surface>
      </div>

      <DataState loading={codesQ.isLoading} error={codesQ.error}
        empty={!codesQ.isLoading && codes.length === 0}
        emptyTitle="No referral codes yet" retry={() => codesQ.refetch()}>
        <Surface padded={false} className="overflow-hidden">
          <div className="px-4 py-3 text-xs uppercase tracking-widest text-dim border-b border-border">Codes</div>
          <table className="w-full text-sm">
            <thead className="bg-surface-2/40 text-[10px] uppercase tracking-widest text-dim">
              <tr>
                <th className="text-start px-4 py-3">Code</th>
                <th className="text-start px-4 py-3">Customer</th>
                <th className="text-start px-4 py-3">Rewards</th>
                <th className="text-start px-4 py-3">Uses</th>
                <th className="text-start px-4 py-3">Active</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono">{c.code}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.customer_id.slice(0,8)}…</td>
                  <td className="px-4 py-3 text-xs">
                    Referrer: {c.referrer_reward} · Referee: {c.referee_reward} ({c.reward_type})
                  </td>
                  <td className="px-4 py-3 font-mono">{c.uses_count}{c.max_uses ? ` / ${c.max_uses}` : ""}</td>
                  <td className="px-4 py-3 text-xs uppercase tracking-wider">{c.active ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Surface>
      </DataState>

      <DataState loading={refsQ.isLoading} error={refsQ.error}
        empty={!refsQ.isLoading && refs.length === 0}
        emptyTitle="No referrals yet" retry={() => refsQ.refetch()}>
        <Surface padded={false} className="overflow-hidden">
          <div className="px-4 py-3 text-xs uppercase tracking-widest text-dim border-b border-border">Referrals</div>
          <table className="w-full text-sm">
            <thead className="bg-surface-2/40 text-[10px] uppercase tracking-widest text-dim">
              <tr>
                <th className="text-start px-4 py-3">Referrer</th>
                <th className="text-start px-4 py-3">Referee</th>
                <th className="text-start px-4 py-3">Rewards</th>
                <th className="text-start px-4 py-3">Status</th>
                <th className="text-end px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {refs.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs">{r.referrer_customer_id.slice(0,8)}…</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.referee_customer_id.slice(0,8)}…</td>
                  <td className="px-4 py-3 text-xs">{r.referrer_reward} / {r.referee_reward} ({r.reward_type})</td>
                  <td className="px-4 py-3 text-xs uppercase tracking-wider">{r.status}</td>
                  <td className="px-4 py-3 text-end">
                    {r.status === "pending" && (
                      <Button size="sm" variant="ghost"
                        onClick={() => completeMut.mutate(r.id)}>
                        <CheckCircle2 className="size-3.5 me-1" /> Complete
                      </Button>
                    )}
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