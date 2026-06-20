import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useData } from "@/lib/store";
import { Modal, Field, inputCls, ModalActions } from "@/components/ui/modal";

export function BookingDialog({
  branchId,
  open,
  onClose,
}: {
  branchId: string;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const addBooking = useData((s) => s.addBooking);
  const customers = useData((s) => s.customers).filter((c) => c.branchId === branchId);
  const employees = useData((s) => s.employees).filter((c) => c.branchId === branchId);
  const services = useData((s) => s.services).filter((c) => c.branchId === branchId);

  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("10:00");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    const service = services.find((s) => s.id === serviceId);
    if (!service) { setErr("Pick a service"); setSaving(false); return; }
    const start = new Date(`${date}T${time}:00`);
    const end = new Date(start.getTime() + service.durationMin * 60_000);
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        branch_id: branchId,
        customer_id: customerId,
        employee_id: employeeId,
        service_id: serviceId,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        status: "confirmed",
        price: service.price,
      })
      .select()
      .single();
    if (error) { setErr(error.message); setSaving(false); return; }
    addBooking({
      branchId, customerId, employeeId, serviceId,
      start: start.toISOString(), end: end.toISOString(),
      status: "confirmed", price: service.price,
    });
    if (data?.id) {
      useData.setState((s) => {
        const bookings = [...s.bookings];
        bookings[bookings.length - 1] = { ...bookings[bookings.length - 1], id: data.id };
        return { bookings };
      });
    }
    qc.invalidateQueries({ queryKey: ["hydrate"] });
    setSaving(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New booking">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Customer">
          <select required value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputCls}>
            <option value="">—</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Service">
          <select required value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={inputCls}>
            <option value="">—</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.nameEn} · {s.durationMin}m</option>)}
          </select>
        </Field>
        <Field label="Employee">
          <select required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={inputCls}>
            <option value="">—</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.nameEn}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
          <Field label="Time"><input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} /></Field>
        </div>
        {err && <p className="text-xs text-red-400">{err}</p>}
        <ModalActions onCancel={onClose} saving={saving} />
      </form>
    </Modal>
  );
}