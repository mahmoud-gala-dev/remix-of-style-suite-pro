import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { useCurrentBranch, useData } from "@/lib/store";
import { useI18n, useT } from "@/lib/i18n";
import { fmtTime } from "@/lib/format";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RouteError, RouteNotFound } from "@/components/shell/route-error";
import { useServerFn } from "@tanstack/react-start";
import { rescheduleBooking } from "@/lib/reschedule.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/calendar")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  ssr: false,
  head: () => ({ meta: [{ title: "Calendar" }] }),
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
  const reschedule = useServerFn(rescheduleBooking);
  const updateBooking = useData((s) => s.updateBooking);
  const [dragId, setDragId] = useState<string | null>(null);
  useEffect(() => {
    const ch = supabase
      .channel("realtime:calendar")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        qc.invalidateQueries({ queryKey: ["hydrate"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);
  const employees = useData((s) => s.employees).filter((e) => e.branchId === branch.id);
  const bookings = useData((s) => s.bookings).filter((b) => b.branchId === branch.id);
  const customers = useData((s) => s.customers);
  const services = useData((s) => s.services);

  const hours = useMemo(() => {
    const open = parseInt(branch.hoursOpen.split(":")[0], 10);
    const close = parseInt(branch.hoursClose.split(":")[0], 10);
    return Array.from({ length: close - open }, (_, i) => open + i);
  }, [branch]);

  const today = new Date();
  const isSameDay = (iso: string) => {
    const d = new Date(iso);
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  };

  async function handleDrop(employeeId: string, hour: number) {
    if (!dragId) return;
    const b = bookings.find((x) => x.id === dragId);
    setDragId(null);
    if (!b) return;
    const newStart = new Date(b.start);
    newStart.setHours(hour, 0, 0, 0);
    const duration = new Date(b.end).getTime() - new Date(b.start).getTime();
    const newEnd = new Date(newStart.getTime() + duration);
    if (b.employeeId === employeeId && new Date(b.start).getHours() === hour) return;
    const prev = { employeeId: b.employeeId, start: b.start, end: b.end };
    updateBooking(b.id, { employeeId, start: newStart.toISOString(), end: newEnd.toISOString() });
    try {
      await reschedule({ data: { id: b.id, employeeId, startAt: newStart.toISOString(), endAt: newEnd.toISOString() } });
      toast.success(t("saved") ?? "Saved");
      await qc.invalidateQueries({ queryKey: ["hydrate"] });
    } catch (e) {
      updateBooking(b.id, prev);
      toast.error(e instanceof Error ? e.message : "Slot taken");
    }
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader title={t("calendar")} subtitle={today.toLocaleDateString([], { dateStyle: "full" })} />

      <Surface padded={false} className="overflow-auto">
        <div className="grid" style={{ gridTemplateColumns: `80px repeat(${employees.length || 1}, minmax(180px, 1fr))` }}>
          {/* header */}
          <div className="border-b border-border bg-surface-2/40" />
          {employees.map((e) => (
            <div key={e.id} className="border-b border-s border-border bg-surface-2/40 p-3">
              <div className="text-sm font-semibold">{lang === "ar" ? e.nameAr : e.nameEn}</div>
              <div className="text-[10px] text-dim uppercase tracking-widest capitalize">{e.role}</div>
            </div>
          ))}

          {/* rows */}
          {hours.map((h) => (
            <FragmentRow
              key={h}
              hour={h}
              employees={employees}
              onDropCell={handleDrop}
              cellRender={(empId) => {
                const cell = bookings.find(
                  (b) =>
                    b.employeeId === empId &&
                    isSameDay(b.start) &&
                    new Date(b.start).getHours() === h,
                );
                if (!cell) return null;
                const cust = customers.find((c) => c.id === cell.customerId);
                const svc = services.find((s) => s.id === cell.serviceId);
                return (
                  <div
                    draggable
                    onDragStart={(e) => { setDragId(cell.id); e.dataTransfer.effectAllowed = "move"; }}
                    onDragEnd={() => setDragId(null)}
                    className="bg-primary/10 border border-primary/40 rounded-md p-2 h-full cursor-grab active:cursor-grabbing"
                  >
                    <div className="text-[10px] text-primary font-mono">{fmtTime(cell.start)}</div>
                    <div className="text-xs font-semibold truncate">{cust?.name}</div>
                    <div className="text-[10px] text-dim truncate">
                      {svc ? (lang === "ar" ? svc.nameAr : svc.nameEn) : ""}
                    </div>
                  </div>
                );
              }}
            />
          ))}
        </div>
      </Surface>
    </div>
  );
}

function FragmentRow({
  hour,
  employees,
  cellRender,
  onDropCell,
}: {
  hour: number;
  employees: { id: string }[];
  cellRender: (empId: string) => React.ReactNode;
  onDropCell: (empId: string, hour: number) => void;
}) {
  return (
    <>
      <div className="border-t border-border p-3 text-[10px] font-mono text-dim text-end">
        {hour.toString().padStart(2, "0")}:00
      </div>
      {employees.map((e) => (
        <div
          key={e.id}
          onDragOver={(ev) => { ev.preventDefault(); ev.dataTransfer.dropEffect = "move"; }}
          onDrop={() => onDropCell(e.id, hour)}
          className="border-t border-s border-border min-h-16 p-1.5"
        >
          {cellRender(e.id)}
        </div>
      ))}
    </>
  );
}
