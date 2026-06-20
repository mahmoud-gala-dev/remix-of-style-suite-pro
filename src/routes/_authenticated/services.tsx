import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { useCurrentBranch, useData } from "@/lib/store";
import { useI18n, useT } from "@/lib/i18n";
import { fmtMoney } from "@/lib/format";
import { Clock, Plus, Users } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { Gender } from "@/types/domain";

export const Route = createFileRoute("/_authenticated/services")({
  ssr: false,
  head: () => ({ meta: [{ title: "Services" }] }),
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
  const list = useData((s) => s.services).filter((x) => x.branchId === branch.id);
  const [open, setOpen] = useState(false);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title={t("services")}
        subtitle={`${list.length} ${t("services").toLowerCase()}`}
        actions={
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-xs font-bold uppercase tracking-widest"
          >
            <Plus className="size-3.5" />
            {t("add")}
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((s) => (
          <Surface key={s.id} className="hover:border-primary/40 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold">{lang === "ar" ? s.nameAr : s.nameEn}</h3>
                <p className="text-[10px] text-dim uppercase tracking-widest mt-0.5">{s.category}</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-sm bg-surface-2 text-dim uppercase font-bold">
                {t(s.gender)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-dim">
                <Clock className="size-3.5" />
                <span className="font-mono">{s.durationMin}m</span>
              </div>
              <span className="font-display text-2xl">{fmtMoney(s.price)}</span>
            </div>
          </Surface>
        ))}
        {list.length === 0 && (
          <Surface className="col-span-full">
            <p className="text-center text-sm text-dim py-8">{t("noData")}</p>
          </Surface>
        )}
      </div>
      {open && <AddServiceDialog branchId={branch.id} onClose={() => setOpen(false)} />}
    </div>
  );
}

function AddServiceDialog({ branchId, onClose }: { branchId: string; onClose: () => void }) {
  const t = useT();
  const qc = useQueryClient();
  const addService = useData((s) => s.addService);
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [category, setCategory] = useState("");
  const [durationMin, setDurationMin] = useState(30);
  const [price, setPrice] = useState(50);
  const [gender, setGender] = useState<Gender>("both");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    const { data, error } = await supabase
      .from("services")
      .insert({
        branch_id: branchId,
        name_en: nameEn,
        name_ar: nameAr || nameEn,
        category,
        duration_min: durationMin,
        price,
        gender,
        active: true,
      })
      .select()
      .single();
    if (error) {
      setErr(error.message);
      setSaving(false);
      return;
    }
    addService({
      branchId,
      nameEn,
      nameAr: nameAr || nameEn,
      category,
      durationMin,
      price,
      gender,
      active: true,
    });
    // Patch the just-added local entry id to match DB
    if (data?.id) {
      useData.setState((s) => {
        const services = [...s.services];
        services[services.length - 1] = { ...services[services.length - 1], id: data.id };
        return { services };
      });
    }
    qc.invalidateQueries({ queryKey: ["hydrate"] });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md bg-surface border border-white/10 rounded-lg p-6 space-y-3"
      >
        <h2 className="font-display text-xl">{t("add")} {t("services")}</h2>
        <Field label="Name (EN)"><input required value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="w-full bg-surface-2 border border-white/10 rounded-md px-3 py-2 text-sm" /></Field>
        <Field label="Name (AR)"><input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="w-full bg-surface-2 border border-white/10 rounded-md px-3 py-2 text-sm" /></Field>
        <Field label="Category"><input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-surface-2 border border-white/10 rounded-md px-3 py-2 text-sm" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Duration (min)">
            <input type="number" min={1} value={durationMin} onChange={(e) => setDurationMin(+e.target.value)} className="w-full bg-surface-2 border border-white/10 rounded-md px-3 py-2 text-sm" />
          </Field>
          <Field label="Price">
            <input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(+e.target.value)} className="w-full bg-surface-2 border border-white/10 rounded-md px-3 py-2 text-sm" />
          </Field>
        </div>
        <Field label="Gender">
          <select value={gender} onChange={(e) => setGender(e.target.value as Gender)} className="w-full bg-surface-2 border border-white/10 rounded-md px-3 py-2 text-sm">
            <option value="both">Both</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </Field>
        {err && <p className="text-xs text-red-400">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-3 py-2 text-xs uppercase tracking-widest border border-white/10 rounded-md">Cancel</button>
          <button disabled={saving} className="px-3 py-2 text-xs uppercase tracking-widest font-bold bg-primary text-primary-foreground rounded-md disabled:opacity-50">
            {saving ? "..." : t("save")}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-dim">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
