import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useData } from "@/lib/store";
import { Modal, Field, inputCls, ModalActions } from "@/components/ui/modal";

export function BranchDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const addBranch = useData((s) => s.addBranch);
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [chairs, setChairs] = useState(4);
  const [hoursOpen, setHoursOpen] = useState("09:00");
  const [hoursClose, setHoursClose] = useState("22:00");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    const { data, error } = await supabase
      .from("branches")
      .insert({
        name_en: nameEn,
        name_ar: nameAr || nameEn,
        address: address || null,
        phone: phone || null,
        chairs,
        hours_open: hoursOpen,
        hours_close: hoursClose,
        active: true,
      })
      .select()
      .single();
    if (error) { setErr(error.message); setSaving(false); return; }
    addBranch({
      nameEn, nameAr: nameAr || nameEn, address, phone, chairs,
      hoursOpen, hoursClose, active: true,
    });
    if (data?.id) {
      useData.setState((s) => {
        const branches = [...s.branches];
        branches[branches.length - 1] = { ...branches[branches.length - 1], id: data.id };
        return { branches };
      });
    }
    qc.invalidateQueries({ queryKey: ["hydrate"] });
    setSaving(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New branch">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name (EN)"><input required value={nameEn} onChange={(e) => setNameEn(e.target.value)} className={inputCls} /></Field>
          <Field label="Name (AR)"><input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label="Address"><input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} /></Field>
          <Field label="Chairs"><input type="number" min={1} value={chairs} onChange={(e) => setChairs(+e.target.value)} className={inputCls} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Opens"><input type="time" value={hoursOpen} onChange={(e) => setHoursOpen(e.target.value)} className={inputCls} /></Field>
          <Field label="Closes"><input type="time" value={hoursClose} onChange={(e) => setHoursClose(e.target.value)} className={inputCls} /></Field>
        </div>
        {err && <p className="text-xs text-red-400">{err}</p>}
        <ModalActions onCancel={onClose} saving={saving} />
      </form>
    </Modal>
  );
}