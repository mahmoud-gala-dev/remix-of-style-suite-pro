import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useData } from "@/lib/store";
import { createBooking } from "@/lib/bookings.functions";
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
  const createBookingFn = useServerFn(createBooking);
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
    try {
      await createBookingFn({
        data: {
          branchId,
          customerId,
          employeeId,
          serviceId,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          price: service.price,
        },
      });
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : "Slot taken";
      setErr(message);
      toast.error(message);
      setSaving(false);
      await qc.invalidateQueries({ queryKey: ["hydrate"] });
      return;
    }
    await qc.invalidateQueries({ queryKey: ["hydrate"] });
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