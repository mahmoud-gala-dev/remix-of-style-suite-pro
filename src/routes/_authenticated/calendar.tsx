import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { useCurrentBranch, useData } from "@/lib/store";
import { useI18n, useT } from "@/lib/i18n";
import { fmtTime } from "@/lib/format";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/calendar")({
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
                  <div className="bg-primary/10 border border-primary/40 rounded-md p-2 h-full">
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
}: {
  hour: number;
  employees: { id: string }[];
  cellRender: (empId: string) => React.ReactNode;
}) {
  return (
    <>
      <div className="border-t border-border p-3 text-[10px] font-mono text-dim text-end">
        {hour.toString().padStart(2, "0")}:00
      </div>
      {employees.map((e) => (
        <div key={e.id} className="border-t border-s border-border min-h-16 p-1.5">
          {cellRender(e.id)}
        </div>
      ))}
    </>
  );
}
