import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useData } from "@/lib/store";
import { Modal, Field, inputCls, ModalActions } from "@/components/ui/modal";
import type { Employee } from "@/types/domain";
import { useT } from "@/lib/i18n";

export function EmployeeDialog({
  branchId,
  open,
  onClose,
}: {
  branchId: string;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const t = useT();
  const addEmployee = useData((s) => s.addEmployee);
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Employee["role"]>("barber");
  const [commissionPct, setCommissionPct] = useState(40);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    const { data, error } = await supabase
      .from("employees")
      .insert({
        branch_id: branchId,
        name_en: nameEn,
        name_ar: nameAr || nameEn,
        phone: phone || null,
        email: email || null,
        role,
        commission_pct: commissionPct,
        rating: 5,
        active: true,
      })
      .select()
      .single();
    if (error) { setErr(error.message); setSaving(false); return; }
    addEmployee({
      branchId, nameEn, nameAr: nameAr || nameEn, phone,
      email: email || undefined, role, commissionPct, rating: 5, active: true,
    });
    if (data?.id) {
      useData.setState((s) => {
        const employees = [...s.employees];
        employees[employees.length - 1] = { ...employees[employees.length - 1], id: data.id };
        return { employees };
      });
    }
    qc.invalidateQueries({ queryKey: ["hydrate"] });
    setSaving(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={t("newEmployee")}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("nameEn")}><input required value={nameEn} onChange={(e) => setNameEn(e.target.value)} className={inputCls} /></Field>
          <Field label={t("nameAr")}><input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className={inputCls} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("phone")}><input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} /></Field>
          <Field label={t("email")}><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("role")}>
            <select value={role} onChange={(e) => setRole(e.target.value as Employee["role"])} className={inputCls}>
              <option value="barber">{t("barber")}</option>
              <option value="stylist">{t("stylist")}</option>
              <option value="reception">{t("receptionRole")}</option>
              <option value="admin">{t("admin")}</option>
            </select>
          </Field>
          <Field label={`${t("commission")} %`}>
            <input type="number" min={0} max={100} value={commissionPct} onChange={(e) => setCommissionPct(+e.target.value)} className={inputCls} />
          </Field>
        </div>
        {err && <p className="text-xs text-red-400">{err}</p>}
        <ModalActions onCancel={onClose} saving={saving} />
      </form>
    </Modal>
  );
}