import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { StatusPill } from "@/components/shell/status-pill";
import { useCurrentBranch, useData } from "@/lib/store";
import { useI18n, useT } from "@/lib/i18n";
import { fmtMoney, fmtTime, fmtDate, isToday } from "@/lib/format";
import { Plus, Download, Check, X, Trash2, Play } from "lucide-react";
import { useState } from "react";
import { BookingDialog } from "@/components/dialogs/booking-dialog";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { downloadCsv, toCsv } from "@/lib/csv";
import { toast } from "sonner";

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
  const updateBooking = useData((s) => s.updateBooking);
  const removeBooking = useData((s) => s.removeBooking);
  const [open, setOpen] = useState(false);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title={t("bookings")}
        subtitle={`${bookings.length} total · ${bookings.filter((b) => isToday(b.start)).length} today`}
        actions={
          <div className="flex items-center gap-2">
          <button
            onClick={() =>
              downloadCsv(
                `bookings-${Date.now()}.csv`,
                toCsv(
                  bookings.map((b) => ({
                    date: fmtDate(b.start),
                    time: fmtTime(b.start),
                    customer: customers.find((c) => c.id === b.customerId)?.name ?? "",
                    service:
                      services.find((s) => s.id === b.serviceId)?.[lang === "ar" ? "nameAr" : "nameEn"] ?? "",
                    stylist:
                      employees.find((e) => e.id === b.employeeId)?.[lang === "ar" ? "nameAr" : "nameEn"] ?? "",
                    price: b.price,
                    status: b.status,
                  })),
                  [
                    { key: "date", label: "Date" },
                    { key: "time", label: "Time" },
                    { key: "customer", label: "Customer" },
                    { key: "service", label: "Service" },
                    { key: "stylist", label: "Stylist" },
                    { key: "price", label: "Price" },
                    { key: "status", label: "Status" },
                  ],
                ),
              )
            }
            className="inline-flex items-center gap-2 border border-border px-3 py-2 rounded-md text-xs font-bold uppercase tracking-widest hover:bg-surface-2/40"
          >
            <Download className="size-3.5" /> CSV
          </button>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-xs font-bold uppercase tracking-widest hover:brightness-110"
          >
            <Plus className="size-3.5" />
            {t("newBooking")}
          </button>
          </div>
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
                <ContextMenu key={b.id}>
                  <ContextMenuTrigger asChild>
                    <tr className="border-t border-border hover:bg-surface-2/30 transition-colors">
                      <Td className="font-mono text-xs">{fmtDate(b.start)}</Td>
                      <Td className="font-mono text-xs">{fmtTime(b.start)}</Td>
                      <Td>{c?.name ?? "—"}</Td>
                      <Td>{s ? (lang === "ar" ? s.nameAr : s.nameEn) : "—"}</Td>
                      <Td className="text-dim">{e ? (lang === "ar" ? e.nameAr : e.nameEn) : "—"}</Td>
                      <Td className="font-mono">{fmtMoney(b.price)}</Td>
                      <Td><StatusPill status={b.status} /></Td>
                    </tr>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onSelect={() => updateBooking(b.id, { status: "confirmed" })}>
                      <Check className="size-3.5 me-2" /> Confirm
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => updateBooking(b.id, { status: "inProgress" })}>
                      <Play className="size-3.5 me-2" /> Start
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => updateBooking(b.id, { status: "completed" })}>
                      <Check className="size-3.5 me-2" /> Complete
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={() => updateBooking(b.id, { status: "cancelled" })}>
                      <X className="size-3.5 me-2" /> Cancel
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => updateBooking(b.id, { status: "noShow" })}>
                      <X className="size-3.5 me-2" /> No-show
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onSelect={() => {
                        toast("Delete this booking?", {
                          action: { label: "Delete", onClick: () => { removeBooking(b.id); toast.success("Deleted"); } },
                          cancel: { label: "Cancel", onClick: () => {} },
                        });
                      }}
                      className="text-red-500 focus:text-red-500"
                    >
                      <Trash2 className="size-3.5 me-2" /> Delete
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
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
