import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { StatusPill } from "@/components/shell/status-pill";
import { useCurrentBranch, useData } from "@/lib/store";
import { useI18n, useT } from "@/lib/i18n";
import { fmtMoney, fmtTime, fmtDate, isToday } from "@/lib/format";
import { Plus } from "lucide-react";
import { useState } from "react";
import { BookingDialog } from "@/components/dialogs/booking-dialog";

export const Route = createFileRoute("/_authenticated/bookings")({
  ssr: false,
  head: () => ({ meta: [{ title: "Bookings" }] }),
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
  const allBookings = useData((s) => s.bookings);
  const bookings = allBookings
    .filter((b) => b.branchId === branch.id)
    .slice()
    .sort((a, b) => b.start.localeCompare(a.start));
  const customers = useData((s) => s.customers);
  const employees = useData((s) => s.employees);
  const services = useData((s) => s.services);
  const [open, setOpen] = useState(false);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title={t("bookings")}
        subtitle={`${bookings.length} total · ${bookings.filter((b) => isToday(b.start)).length} today`}
        actions={
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-xs font-bold uppercase tracking-widest hover:brightness-110"
          >
            <Plus className="size-3.5" />
            {t("newBooking")}
          </button>
        }
      />

      <Surface padded={false} className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-2/40 text-[10px] uppercase tracking-widest text-dim">
            <tr>
              <Th>{t("date")}</Th>
              <Th>{t("time")}</Th>
              <Th>{t("customer")}</Th>
              <Th>{t("services")}</Th>
              <Th>{t("stylist")}</Th>
              <Th>{t("price")}</Th>
              <Th>{t("status")}</Th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => {
              const c = customers.find((x) => x.id === b.customerId);
              const e = employees.find((x) => x.id === b.employeeId);
              const s = services.find((x) => x.id === b.serviceId);
              return (
                <tr key={b.id} className="border-t border-border hover:bg-surface-2/30 transition-colors">
                  <Td className="font-mono text-xs">{fmtDate(b.start)}</Td>
                  <Td className="font-mono text-xs">{fmtTime(b.start)}</Td>
                  <Td>{c?.name ?? "—"}</Td>
                  <Td>{s ? (lang === "ar" ? s.nameAr : s.nameEn) : "—"}</Td>
                  <Td className="text-dim">{e ? (lang === "ar" ? e.nameAr : e.nameEn) : "—"}</Td>
                  <Td className="font-mono">{fmtMoney(b.price)}</Td>
                  <Td><StatusPill status={b.status} /></Td>
                </tr>
              );
            })}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={7} className="p-12 text-center text-sm text-dim">{t("noData")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </Surface>
      <BookingDialog open={open} onClose={() => setOpen(false)} branchId={branch.id} />
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-start px-4 py-3 font-bold">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}
