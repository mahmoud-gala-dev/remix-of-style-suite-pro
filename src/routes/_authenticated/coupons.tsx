import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Plus, Ticket } from "lucide-react";
import { Modal, Field, inputCls, ModalActions } from "@/components/ui/modal";
import { useCurrentBranch } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { DataState } from "@/components/shell/data-state";

type Coupon = {
  id: string; code: string; kind: "percent" | "fixed"; value: number;
  max_uses: number | null; used_count: number; valid_until: string | null; active: boolean;
};

export const Route = createFileRoute("/_authenticated/coupons")({
  ssr: false,
  head: () => ({ meta: [{ title: "Coupons" }] }),
  component: () => (
    <AppShell><Page /></AppShell>
  ),
});

function Page() {
  const t = useT();
  const branch = useCurrentBranch();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const q = useQuery({
    queryKey: ["coupons", branch.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*").eq("branch_id", branch.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
  });

  const list = q.data ?? [];

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title={t("coupons")}
        subtitle={`${list.length} total`}
        actions={
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-xs font-bold uppercase tracking-widest">
            <Plus className="size-3.5" /> New coupon
          </button>
        }
      />

      <DataState
        loading={q.isLoading}
        error={q.error}
        empty={!q.isLoading && list.length === 0}
        emptyTitle={t("noData")}
        retry={() => q.refetch()}
      >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((c) => (
          <Surface key={c.id} className="hover:border-primary/40 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
                <Ticket className="size-5" />
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-sm uppercase font-bold ${c.active ? "bg-primary/10 text-primary" : "bg-surface-2 text-dim"}`}>
                {c.active ? "active" : "off"}
              </span>
            </div>
            <div className="font-mono text-xl tracking-widest">{c.code}</div>
            <div className="font-display text-2xl mt-2">
              {c.kind === "percent" ? `${c.value}%` : `${c.value}`}
              <span className="text-xs text-dim ms-2 uppercase">{c.kind}</span>
            </div>
            <div className="text-[10px] text-dim mt-3 uppercase tracking-widest">
              Used {c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ""}
              {c.valid_until && ` · until ${new Date(c.valid_until).toLocaleDateString()}`}
            </div>
          </Surface>
        ))}
      </div>
      </DataState>

      <CouponDialog open={open} onClose={() => setOpen(false)} branchId={branch.id} onCreated={() => qc.invalidateQueries({ queryKey: ["coupons"] })} />
    </div>
  );
}

function CouponDialog({ open, onClose, branchId, onCreated }: { open: boolean; onClose: () => void; branchId: string; onCreated: () => void }) {
  const t = useT();
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState(10);
  const [maxUses, setMaxUses] = useState<number | "">("");
  const [validUntil, setValidUntil] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr(null);
    const { error } = await supabase.from("coupons").insert({
      branch_id: branchId,
      code: code.trim().toUpperCase(),
      kind, value,
      max_uses: maxUses === "" ? null : maxUses,
      valid_until: validUntil ? new Date(validUntil).toISOString() : null,
    });
    if (error) { setErr(error.message); setSaving(false); return; }
    onCreated(); setSaving(false); onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={t("newCoupon")}>
      <form onSubmit={submit} className="space-y-3">
        <Field label={t("codeLabel")}><input required value={code} onChange={(e) => setCode(e.target.value)} className={inputCls} placeholder="WELCOME10" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("kind")}>
            <select value={kind} onChange={(e) => setKind(e.target.value as any)} className={inputCls}>
              <option value="percent">{t("percentDiscount")}</option>
              <option value="fixed">{t("fixedAmount")}</option>
            </select>
          </Field>
          <Field label={t("valueLabel")}><input type="number" min={0} step="0.01" value={value} onChange={(e) => setValue(+e.target.value)} className={inputCls} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("maxUsesOptional")}><input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value === "" ? "" : +e.target.value)} className={inputCls} /></Field>
          <Field label={t("validUntil")}><input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={inputCls} /></Field>
        </div>
        {err && <p className="text-xs text-red-400">{err}</p>}
        <ModalActions onCancel={onClose} saving={saving} />
      </form>
    </Modal>
  );
}