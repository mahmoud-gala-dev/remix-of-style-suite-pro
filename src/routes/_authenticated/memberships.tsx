import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Plus, Crown } from "lucide-react";
import { Modal, Field, inputCls, ModalActions } from "@/components/ui/modal";
import { fmtMoney } from "@/lib/format";
import { useCurrentBranch, useData } from "@/lib/store";
import { useI18n, useT } from "@/lib/i18n";
import { DataState } from "@/components/shell/data-state";
import type { Tables } from "@/integrations/supabase/types";

type Member = Tables<"customer_memberships">;

type Plan = {
  id: string;
  name_en: string;
  name_ar: string;
  tier: string;
  price: number;
  visits: number;
  validity_days: number;
  discount_pct: number;
  active: boolean;
};

export const Route = createFileRoute("/_authenticated/memberships")({
  ssr: false,
  head: () => ({ meta: [{ title: "Memberships" }] }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});

function Page() {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const branch = useCurrentBranch();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const customers = useData((s) => s.customers).filter((c) => c.branchId === branch.id);

  const plansQ = useQuery({
    queryKey: ["membership_plans", branch.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("membership_plans")
        .select("*")
        .eq("branch_id", branch.id)
        .order("price");
      if (error) throw error;
      return data as Plan[];
    },
  });

  const membersQ = useQuery({
    queryKey: ["customer_memberships", branch.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_memberships")
        .select("*")
        .eq("branch_id", branch.id)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const plans = plansQ.data ?? [];
  const members = membersQ.data ?? [];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      <PageHeader
        title={t("memberships")}
        subtitle={`${plans.length} plans · ${members.length} active members`}
        actions={
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-xs font-bold uppercase tracking-widest"
          >
            <Plus className="size-3.5" /> New plan
          </button>
        }
      />

      <DataState
        loading={plansQ.isLoading}
        error={plansQ.error}
        empty={!plansQ.isLoading && plans.length === 0}
        emptyTitle={t("noData")}
        retry={() => plansQ.refetch()}
      >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((p) => (
          <Surface key={p.id} className="hover:border-primary/40 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
                <Crown className="size-5" />
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-sm bg-surface-2 text-dim uppercase font-bold">
                {p.tier}
              </span>
            </div>
            <h3 className="font-display text-xl">{lang === "ar" ? p.name_ar : p.name_en}</h3>
            <div className="font-mono text-3xl mt-3">{fmtMoney(Number(p.price))}</div>
            <ul className="text-xs text-dim mt-4 space-y-1.5">
              <li>{p.visits} visits</li>
              <li>Valid {p.validity_days} days</li>
              <li>{p.discount_pct}% discount</li>
            </ul>
          </Surface>
        ))}
      </div>
      </DataState>

      <div>
        <h3 className="font-display uppercase tracking-tight text-sm mb-3">Active members</h3>
        <Surface padded={false}>
          <DataState
            loading={membersQ.isLoading}
            error={membersQ.error}
            empty={!membersQ.isLoading && members.length === 0}
            emptyTitle={t("noData")}
            retry={() => membersQ.refetch()}
          >
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-widest text-dim">
              <tr>
                <Th>{t("customer")}</Th>
                <Th>{t("plan")}</Th>
                <Th>{t("remaining")}</Th>
                <Th>{t("expires")}</Th>
                <Th>{t("status")}</Th>
              </tr>
            </thead>
            <tbody>
              {members.map((m: Member) => {
                const cust = customers.find((c) => c.id === m.customer_id);
                const plan = plans.find((p) => p.id === m.plan_id);
                return (
                  <tr key={m.id} className="border-t border-border">
                    <Td>{cust?.name ?? "—"}</Td>
                    <Td>{plan?.name_en ?? "—"}</Td>
                    <Td className="font-mono">{m.remaining_visits}</Td>
                    <Td className="font-mono text-xs text-dim">
                      {new Date(m.expires_at).toLocaleDateString()}
                    </Td>
                    <Td>
                      <span className="text-[10px] px-2 py-0.5 rounded-sm bg-primary/10 text-primary uppercase font-bold">
                        {m.status}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </DataState>
        </Surface>
      </div>

      <PlanDialog
        open={open}
        onClose={() => setOpen(false)}
        branchId={branch.id}
        onCreated={() => qc.invalidateQueries({ queryKey: ["membership_plans"] })}
      />
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-start px-4 py-3 font-bold">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

function PlanDialog({
  open, onClose, branchId, onCreated,
}: { open: boolean; onClose: () => void; branchId: string; onCreated: () => void }) {
  const t = useT();
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [tier, setTier] = useState("silver");
  const [price, setPrice] = useState(500);
  const [visits, setVisits] = useState(10);
  const [validityDays, setValidityDays] = useState(60);
  const [discountPct, setDiscountPct] = useState(10);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr(null);
    const { error } = await supabase.from("membership_plans").insert({
      branch_id: branchId,
      name_en: nameEn, name_ar: nameAr || nameEn,
      tier, price, visits, validity_days: validityDays, discount_pct: discountPct,
    });
    if (error) { setErr(error.message); setSaving(false); return; }
    onCreated(); setSaving(false); onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={t("newMembershipPlan")}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("nameEn")}><input required value={nameEn} onChange={(e) => setNameEn(e.target.value)} className={inputCls} /></Field>
          <Field label={t("nameAr")}><input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label={t("tier")}>
          <select value={tier} onChange={(e) => setTier(e.target.value)} className={inputCls}>
            <option value="silver">{t("silver")}</option>
            <option value="gold">{t("gold")}</option>
            <option value="vip">{t("vip")}</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("price")}><input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(+e.target.value)} className={inputCls} /></Field>
          <Field label={t("visits")}><input type="number" min={0} value={visits} onChange={(e) => setVisits(+e.target.value)} className={inputCls} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("validityDays")}><input type="number" min={1} value={validityDays} onChange={(e) => setValidityDays(+e.target.value)} className={inputCls} /></Field>
          <Field label={`${t("discount")} %`}><input type="number" min={0} max={100} value={discountPct} onChange={(e) => setDiscountPct(+e.target.value)} className={inputCls} /></Field>
        </div>
        {err && <p className="text-xs text-red-400">{err}</p>}
        <ModalActions onCancel={onClose} saving={saving} />
      </form>
    </Modal>
  );
}