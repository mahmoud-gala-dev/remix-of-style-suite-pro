import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useData } from "@/lib/store";
import { Modal, Field, inputCls, ModalActions } from "@/components/ui/modal";
import type { Gender } from "@/types/domain";

export function CustomerDialog({
  branchId,
  open,
  onClose,
}: {
  branchId: string;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const addCustomer = useData((s) => s.addCustomer);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<Gender>("both");
  const [birthday, setBirthday] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    const { data, error } = await supabase
      .from("customers")
      .insert({
        branch_id: branchId,
        name,
        phone: phone || null,
        email: email || null,
        gender,
        birthday: birthday || null,
      })
      .select()
      .single();
    if (error) {
      setErr(error.message);
      setSaving(false);
      return;
    }
    addCustomer({ branchId, name, phone, email: email || undefined, gender });
    if (data?.id) {
      useData.setState((s) => {
        const customers = [...s.customers];
        customers[customers.length - 1] = { ...customers[customers.length - 1], id: data.id };
        return { customers };
      });
    }
    qc.invalidateQueries({ queryKey: ["hydrate"] });
    setName(""); setPhone(""); setEmail(""); setBirthday("");
    setSaving(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New customer">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Name"><input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} /></Field>
          <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Gender">
            <select value={gender} onChange={(e) => setGender(e.target.value as Gender)} className={inputCls}>
              <option value="both">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </Field>
          <Field label="Birthday"><input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className={inputCls} /></Field>
        </div>
        {err && <p className="text-xs text-red-400">{err}</p>}
        <ModalActions onCancel={onClose} saving={saving} />
      </form>
    </Modal>
  );
}