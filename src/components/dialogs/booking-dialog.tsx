import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useData } from "@/lib/store";
import { createBooking } from "@/lib/bookings.functions";
import { createRecurringSeries } from "@/lib/recurring.functions";
import { Modal, Field, inputCls, ModalActions } from "@/components/ui/modal";
import { notify } from "@/lib/push";
import { useT } from "@/lib/i18n";

export function BookingDialog({
  branchId,
  open,
  onClose,
}: {
  branchId: string;
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const qc = useQueryClient();
  const createBookingFn = useServerFn(createBooking);
  const createSeriesFn = useServerFn(createRecurringSeries);
  const customers = useData((s) => s.customers).filter((c) => c.branchId === branchId);
  const employees = useData((s) => s.employees).filter((c) => c.branchId === branchId);
  const services = useData((s) => s.services).filter((c) => c.branchId === branchId);

  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("10:00");
  const [recurrence, setRecurrence] = useState<"none" | "weekly" | "biweekly" | "monthly">("none");
  const [occurrences, setOccurrences] = useState(4);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    const service = services.find((s) => s.id === serviceId);
    if (!service) { setErr(t("pickService")); setSaving(false); return; }
    const start = new Date(`${date}T${time}:00`);
    const end = new Date(start.getTime() + service.durationMin * 60_000);
    try {
      if (recurrence === "none") {
        await createBookingFn({
          data: {
            branchId, customerId, employeeId, serviceId,
            startAt: start.toISOString(), endAt: end.toISOString(), price: service.price,
          },
        });
        const customer = customers.find((c) => c.id === customerId);
        notify(t("newBooking"), `${customer?.name ?? t("customer")} · ${service.nameEn} @ ${time}`);
      } else {
        const res = await createSeriesFn({
          data: {
            branchId, customerId, employeeId, serviceId,
            startAt: start.toISOString(), endAt: end.toISOString(), price: service.price,
            pattern: recurrence, occurrences,
          },
        });
        toast.success(t("seriesCreated").replace("{n}", String(res.count)));
        notify(t("newBooking"), t("seriesCreated").replace("{n}", String(res.count)));
      }
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
    <Modal open={open} onClose={onClose} title={t("newBooking")}>
      <form onSubmit={submit} className="space-y-3">
        <Field label={t("customer")}>
          <select required value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputCls}>
            <option value="">—</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label={t("services")}>
          <select required value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={inputCls}>
            <option value="">—</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.nameEn} · {s.durationMin}m</option>)}
          </select>
        </Field>
        <Field label={t("employee")}>
          <select required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={inputCls}>
            <option value="">—</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.nameEn}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("date")}><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
          <Field label={t("time")}><input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("repeat")}>
            <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as typeof recurrence)} className={inputCls}>
              <option value="none">{t("noRepeat")}</option>
              <option value="weekly">{t("everyWeek")}</option>
              <option value="biweekly">{t("everyTwoWeeks")}</option>
              <option value="monthly">{t("everyMonth")}</option>
            </select>
          </Field>
          {recurrence !== "none" && (
            <Field label={t("occurrences")}>
              <input type="number" min={2} max={26} value={occurrences}
                onChange={(e) => setOccurrences(Math.max(2, Math.min(26, Number(e.target.value) || 2)))}
                className={inputCls} />
            </Field>
          )}
        </div>
        {err && <p className="text-xs text-red-400">{err}</p>}
        <ModalActions onCancel={onClose} saving={saving} />
      </form>
    </Modal>
  );
}