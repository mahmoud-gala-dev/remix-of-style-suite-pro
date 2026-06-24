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
import { Plus, Ban, Search, Wallet } from "lucide-react";
import { RouteError, RouteNotFound } from "@/components/shell/route-error";
import {
  listGiftCards, issueGiftCard, lookupGiftCard, redeemGiftCard, cancelGiftCard,
} from "@/lib/gift-cards.functions";

export const Route = createFileRoute("/_authenticated/gift-cards")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  ssr: false,
  head: () => ({ meta: [{ title: "Gift Cards" }] }),
  component: () => (<AppShell><Page /></AppShell>),
});

function Page() {
  const t = useT();
  const branch = useCurrentBranch();
  const qc = useQueryClient();
  const list = useServerFn(listGiftCards);
  const issueFn = useServerFn(issueGiftCard);
  const lookupFn = useServerFn(lookupGiftCard);
  const redeemFn = useServerFn(redeemGiftCard);
  const cancelFn = useServerFn(cancelGiftCard);

  const q = useQuery({
    queryKey: ["gift_cards", branch.id],
    queryFn: () => list({ data: { branchId: branch.id } }),
  });

  const [amount, setAmount] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");

  const [lookupCode, setLookupCode] = useState("");
  const [redeemAmount, setRedeemAmount] = useState("");
  const [foundCard, setFoundCard] = useState<null | {
    id: string; code: string; balance: number; currency: string; status: string;
  }>(null);

  const issueMut = useMutation({
    mutationFn: () => issueFn({ data: {
      branchId: branch.id,
      amount: Number(amount),
      currency: "SAR",
      recipientName: recipientName || undefined,
      recipientPhone: recipientPhone || undefined,
      recipientEmail: recipientEmail || undefined,
      message: message || undefined,
    }}),
    onSuccess: (r) => {
      toast.success(`Created card: ${r.code}`);
      setAmount(""); setRecipientName(""); setRecipientPhone("");
      setRecipientEmail(""); setMessage("");
      qc.invalidateQueries({ queryKey: ["gift_cards", branch.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lookupMut = useMutation({
    mutationFn: () => lookupFn({ data: { code: lookupCode.trim() } }),
    onSuccess: (r) => setFoundCard({
      id: r.id, code: r.code, balance: Number(r.balance),
      currency: r.currency, status: r.status,
    }),
    onError: (e: Error) => { setFoundCard(null); toast.error(e.message); },
  });

  const redeemMut = useMutation({
    mutationFn: () => redeemFn({ data: {
      id: foundCard!.id, amount: Number(redeemAmount),
    }}),
    onSuccess: (r) => {
      toast.success(`Redeemed. New balance: ${r.balance}`);
      setFoundCard((f) => f ? { ...f, balance: r.balance, status: r.status } : null);
      setRedeemAmount("");
      qc.invalidateQueries({ queryKey: ["gift_cards", branch.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelFn({ data: { id } }),
    onSuccess: () => { toast.success("Cancelled"); qc.invalidateQueries({ queryKey: ["gift_cards", branch.id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = q.data ?? [];

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader title={t("gift_cards")} subtitle={`${rows.length} total`} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Surface>
          <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Issue new card</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input type="number" min={1} placeholder="Amount (SAR)" value={amount}
              onChange={(e) => setAmount(e.target.value)} />
            <Input placeholder="Recipient name" value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)} />
            <Input placeholder="Recipient phone" value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)} />
            <Input placeholder="Recipient email" value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)} />
            <Textarea className="md:col-span-2" rows={2} placeholder="Personal message (optional)"
              value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <div className="mt-3 flex justify-end">
            <Button onClick={() => issueMut.mutate()}
              disabled={!amount || Number(amount) <= 0 || issueMut.isPending}>
              <Plus className="size-4 me-1" /> {issueMut.isPending ? "Issuing…" : "Issue card"}
            </Button>
          </div>
        </Surface>

        <Surface>
          <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Redeem / Lookup</h3>
          <div className="flex gap-2">
            <Input placeholder="Enter code" value={lookupCode}
              onChange={(e) => setLookupCode(e.target.value.toUpperCase())} />
            <Button variant="outline" onClick={() => lookupMut.mutate()} disabled={!lookupCode || lookupMut.isPending}>
              <Search className="size-4 me-1" /> Lookup
            </Button>
          </div>
          {foundCard && (
            <div className="mt-4 rounded-md border p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-mono">{foundCard.code}</span>
                <span className="uppercase text-xs tracking-wider">{foundCard.status}</span>
              </div>
              <div className="flex items-center gap-2 text-lg font-bold">
                <Wallet className="size-5" />
                {foundCard.balance} {foundCard.currency}
              </div>
              {foundCard.status === "active" && (
                <div className="flex gap-2">
                  <Input type="number" min={1} max={foundCard.balance}
                    placeholder="Amount to redeem" value={redeemAmount}
                    onChange={(e) => setRedeemAmount(e.target.value)} />
                  <Button onClick={() => redeemMut.mutate()}
                    disabled={!redeemAmount || Number(redeemAmount) <= 0 || redeemMut.isPending}>
                    Redeem
                  </Button>
                </div>
              )}
            </div>
          )}
        </Surface>
      </div>

      <DataState loading={q.isLoading} error={q.error}
        empty={!q.isLoading && rows.length === 0} emptyTitle="No gift cards yet"
        retry={() => q.refetch()}>
        <Surface padded={false} className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-2/40 text-[10px] uppercase tracking-widest text-dim">
              <tr>
                <th className="text-start px-4 py-3">Code</th>
                <th className="text-start px-4 py-3">Recipient</th>
                <th className="text-start px-4 py-3">Balance / Initial</th>
                <th className="text-start px-4 py-3">Status</th>
                <th className="text-start px-4 py-3">Expires</th>
                <th className="text-end px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono">{c.code}</td>
                  <td className="px-4 py-3">{c.issued_to_name ?? "—"}<br/>
                    <span className="text-xs text-dim">{c.issued_to_phone ?? c.issued_to_email ?? ""}</span></td>
                  <td className="px-4 py-3 font-mono">{c.balance} / {c.initial_amount} {c.currency}</td>
                  <td className="px-4 py-3"><span className="text-xs uppercase tracking-wider">{c.status}</span></td>
                  <td className="px-4 py-3 text-xs">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 text-end">
                    {c.status === "active" && (
                      <Button size="sm" variant="ghost" className="text-red-500"
                        onClick={() => cancelMut.mutate(c.id)}>
                        <Ban className="size-3.5 me-1" /> Cancel
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