import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { Field, inputCls } from "@/components/ui/modal";
import { supabase } from "@/integrations/supabase/client";
import { useData } from "@/lib/store";
import { useI18n, useT } from "@/lib/i18n";
import { seedServiceTemplates, SALON_TYPES, type SalonType } from "@/lib/salon-type.functions";
import { RouteError, RouteNotFound } from "@/components/shell/route-error";
import { toast } from "sonner";
import type { Employee } from "@/types/domain";
import { Check, ChevronRight, Scissors, Sparkles, Store, UserCog } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  ssr: false,
  head: () => ({ meta: [{ title: "Setup Wizard" }] }),
  component: () => (
    <AppShell>
      <Wizard />
    </AppShell>
  ),
});

const SALON_LABEL: Record<SalonType, { en: string; ar: string; icon: string }> = {
  barbershop: { en: "Barbershop", ar: "حلاقة رجالية", icon: "✂️" },
  women_salon: { en: "Women's Salon", ar: "صالون نسائي", icon: "💇‍♀️" },
  unisex: { en: "Unisex Salon", ar: "صالون مختلط", icon: "💈" },
  spa: { en: "Spa / Wellness", ar: "سبا واسترخاء", icon: "🧖" },
};

function Wizard() {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const seedTpl = useServerFn(seedServiceTemplates);
  const addBranch = useData((s) => s.addBranch);
  const addEmployee = useData((s) => s.addEmployee);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Step 1
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [chairs, setChairs] = useState(4);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  // Step 2
  const [salonType, setSalonType] = useState<SalonType>("barbershop");
  const [seededCount, setSeededCount] = useState<number | null>(null);

  // Step 3
  const [empNameEn, setEmpNameEn] = useState("");
  const [empNameAr, setEmpNameAr] = useState("");
  const [empPhone, setEmpPhone] = useState("");
  const [empRole, setEmpRole] = useState<Employee["role"]>("barber");

  async function submitBranch(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const { data, error } = await supabase
      .from("branches")
      .insert({
        name_en: nameEn,
        name_ar: nameAr || nameEn,
        address: address || null,
        phone: phone || null,
        chairs,
        hours_open: "09:00",
        hours_close: "22:00",
        active: true,
      })
      .select("id,tenant_id")
      .single();
    if (error || !data) { setErr(error?.message ?? "Failed"); setBusy(false); return; }
    addBranch({
      nameEn, nameAr: nameAr || nameEn, address, phone, chairs,
      hoursOpen: "09:00", hoursClose: "22:00", active: true,
    });
    useData.setState((s) => {
      const branches = [...s.branches];
      branches[branches.length - 1] = { ...branches[branches.length - 1], id: data.id };
      return { branches, currentBranchId: data.id };
    });
    setBranchId(data.id);
    setTenantId((data as { tenant_id?: string }).tenant_id ?? null);
    qc.invalidateQueries({ queryKey: ["hydrate"] });
    setBusy(false);
    setStep(2);
  }

  async function submitTemplates() {
    if (!branchId) return;
    setBusy(true); setErr(null);
    try {
      // Resolve tenant_id if RLS didn't return it (older policies)
      let tid = tenantId;
      if (!tid) {
        const { data } = await supabase.from("branches").select("tenant_id").eq("id", branchId).maybeSingle();
        tid = (data as { tenant_id?: string } | null)?.tenant_id ?? null;
      }
      if (!tid) throw new Error("Tenant not found for this branch");
      const out = await seedTpl({ data: { tenant_id: tid, branch_id: branchId, salon_type: salonType } });
      setSeededCount(out.inserted);
      qc.invalidateQueries({ queryKey: ["hydrate"] });
      toast.success(`${out.inserted} ${lang === "ar" ? "خدمة أُضيفت" : "services added"}`);
      setStep(3);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!branchId) return;
    setBusy(true); setErr(null);
    const { data, error } = await supabase
      .from("employees")
      .insert({
        branch_id: branchId,
        name_en: empNameEn,
        name_ar: empNameAr || empNameEn,
        phone: empPhone || null,
        role: empRole,
        commission_pct: 40,
        rating: 5,
        active: true,
      })
      .select("id")
      .single();
    if (error || !data) { setErr(error?.message ?? "Failed"); setBusy(false); return; }
    addEmployee({
      branchId, nameEn: empNameEn, nameAr: empNameAr || empNameEn,
      phone: empPhone, role: empRole, commissionPct: 40, rating: 5, active: true,
    });
    useData.setState((s) => {
      const employees = [...s.employees];
      employees[employees.length - 1] = { ...employees[employees.length - 1], id: data.id };
      return { employees };
    });
    qc.invalidateQueries({ queryKey: ["hydrate"] });
    setBusy(false);
    toast.success(lang === "ar" ? "تم الإعداد بنجاح" : "Setup complete");
    navigate({ to: "/" });
  }

  function skipEmployee() {
    toast.success(lang === "ar" ? "يمكنك إضافة الموظفين لاحقاً" : "You can add staff later");
    navigate({ to: "/" });
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <PageHeader title={t("setup_wizard")} subtitle={t("setup_wizard_sub")} />

      <Stepper step={step} lang={lang} />

      {err && (
        <p className="text-xs text-red-400 mb-4 px-3 py-2 rounded bg-red-500/10 border border-red-500/30">
          {err}
        </p>
      )}

      {step === 1 && (
        <Surface>
          <h2 className="font-display text-lg uppercase tracking-tight mb-1 flex items-center gap-2">
            <Store className="size-4 text-primary" /> {t("step1_branch")}
          </h2>
          <p className="text-xs text-dim mb-4">{t("step1_sub")}</p>
          <form onSubmit={submitBranch} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("nameEn")}>
                <input required value={nameEn} onChange={(e) => setNameEn(e.target.value)} className={inputCls} />
              </Field>
              <Field label={t("nameAr")}>
                <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className={inputCls} />
              </Field>
            </div>
            <Field label={t("address")}>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("phone")}>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
              </Field>
              <Field label={t("chairs")}>
                <input type="number" min={1} value={chairs} onChange={(e) => setChairs(+e.target.value)} className={inputCls} />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="submit" disabled={busy || !nameEn}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest disabled:opacity-50">
                {busy ? "…" : t("next")} <ChevronRight className="size-3.5" />
              </button>
            </div>
          </form>
        </Surface>
      )}

      {step === 2 && (
        <Surface>
          <h2 className="font-display text-lg uppercase tracking-tight mb-1 flex items-center gap-2">
            <Scissors className="size-4 text-primary" /> {t("step2_services")}
          </h2>
          <p className="text-xs text-dim mb-4">{t("step2_sub")}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {SALON_TYPES.map((s) => {
              const info = SALON_LABEL[s];
              const active = salonType === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSalonType(s)}
                  className={`text-center rounded-md border p-4 transition-colors ${
                    active ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="text-2xl mb-1">{info.icon}</div>
                  <div className="text-xs font-semibold">{lang === "ar" ? info.ar : info.en}</div>
                </button>
              );
            })}
          </div>

          {seededCount !== null && (
            <p className="text-xs text-emerald-400 mb-3 flex items-center gap-1.5">
              <Check className="size-3.5" /> {seededCount} {lang === "ar" ? "خدمة جاهزة" : "services ready"}
            </p>
          )}

          <div className="flex justify-between gap-2 pt-2">
            <button type="button" onClick={() => setStep(1)}
              className="text-xs text-dim hover:text-foreground px-3 py-2">
              {t("back")}
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(3)}
                className="text-xs text-dim hover:text-foreground px-3 py-2">
                {t("skip")}
              </button>
              <button type="button" onClick={submitTemplates} disabled={busy}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest disabled:opacity-50">
                <Sparkles className="size-3.5" />
                {busy ? "…" : t("seed_templates")}
              </button>
            </div>
          </div>
        </Surface>
      )}

      {step === 3 && (
        <Surface>
          <h2 className="font-display text-lg uppercase tracking-tight mb-1 flex items-center gap-2">
            <UserCog className="size-4 text-primary" /> {t("step3_staff")}
          </h2>
          <p className="text-xs text-dim mb-4">{t("step3_sub")}</p>
          <form onSubmit={submitEmployee} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("nameEn")}>
                <input required value={empNameEn} onChange={(e) => setEmpNameEn(e.target.value)} className={inputCls} />
              </Field>
              <Field label={t("nameAr")}>
                <input value={empNameAr} onChange={(e) => setEmpNameAr(e.target.value)} className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("phone")}>
                <input value={empPhone} onChange={(e) => setEmpPhone(e.target.value)} className={inputCls} />
              </Field>
              <Field label={t("role")}>
                <select value={empRole} onChange={(e) => setEmpRole(e.target.value as Employee["role"])} className={inputCls}>
                  <option value="barber">{t("barber")}</option>
                  <option value="stylist">{t("stylist")}</option>
                  <option value="reception">{t("receptionRole")}</option>
                  <option value="admin">{t("admin")}</option>
                </select>
              </Field>
            </div>
            <div className="flex justify-between gap-2 pt-2">
              <button type="button" onClick={() => setStep(2)}
                className="text-xs text-dim hover:text-foreground px-3 py-2">
                {t("back")}
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={skipEmployee}
                  className="text-xs text-dim hover:text-foreground px-3 py-2">
                  {t("finish_later")}
                </button>
                <button type="submit" disabled={busy || !empNameEn}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest disabled:opacity-50">
                  <Check className="size-3.5" />
                  {busy ? "…" : t("finish_setup")}
                </button>
              </div>
            </div>
          </form>
        </Surface>
      )}
    </div>
  );
}

function Stepper({ step, lang }: { step: 1 | 2 | 3; lang: "en" | "ar" }) {
  const labels = lang === "ar"
    ? ["الفرع", "الخدمات", "الموظفون"]
    : ["Branch", "Services", "Staff"];
  return (
    <div className="flex items-center gap-3 mb-6">
      {labels.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const done = step > n;
        const active = step === n;
        return (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className={`size-7 rounded-full grid place-items-center text-xs font-bold border ${
              done ? "bg-emerald-500 text-white border-emerald-500"
                   : active ? "bg-primary text-primary-foreground border-primary"
                   : "bg-surface text-dim border-border"
            }`}>
              {done ? <Check className="size-3.5" /> : n}
            </div>
            <span className={`text-xs uppercase tracking-widest ${active ? "text-foreground" : "text-dim"}`}>
              {label}
            </span>
            {i < 2 && <div className="flex-1 h-px bg-border" />}
          </div>
        );
      })}
    </div>
  );
}
