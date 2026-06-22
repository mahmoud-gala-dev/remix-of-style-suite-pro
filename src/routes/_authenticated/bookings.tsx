import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { StatusPill } from "@/components/shell/status-pill";
import { useCurrentBranch, useData } from "@/lib/store";
import { useI18n, useT } from "@/lib/i18n";
import { fmtMoney, fmtTime, fmtDate, isToday } from "@/lib/format";
import { Plus, Download, Check, X, Trash2, Play, Calendar } from "lucide-react";
import { EmptyState } from "@/components/shell/empty-state";
import { useState } from "react";
import { BookingDialog } from "@/components/dialogs/booking-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel("realtime:bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        qc.invalidateQueries({ queryKey: ["bookings"] });
        qc.invalidateQueries({ queryKey: ["hydrate"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setSelected((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSelected((p) => p.size === bookings.length ? new Set() : new Set(bookings.map((b) => b.id)));
  const bulkSet = (status: "confirmed" | "cancelled" | "noShow" | "completed") => {
    selected.forEach((id) => updateBooking(id, { status }));
    toast.success(`${selected.size} → ${status}`);
    setSelected(new Set());
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title={t("bookings")}
        subtitle={t("bookingsSummary").replace("{n}", String(bookings.length)).replace("{today}", String(bookings.filter((b) => isToday(b.start)).length))}
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
                    { key: "date", label: t("date") },
                    { key: "time", label: t("time") },
                    { key: "customer", label: t("customer") },
                    { key: "service", label: t("service") },
                    { key: "stylist", label: t("stylist") },
                    { key: "price", label: t("price") },
                    { key: "status", label: t("status") },
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
        {selected.size > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-surface-2/50 text-xs">
            <span className="font-mono">{selected.size} selected</span>
            <div className="flex-1" />
            <button onClick={() => bulkSet("confirmed")} className="px-2 py-1 rounded border border-white/10 hover:bg-surface-2">{t("confirm")}</button>
            <button onClick={() => bulkSet("completed")} className="px-2 py-1 rounded border border-white/10 hover:bg-surface-2">{t("complete")}</button>
            <button onClick={() => bulkSet("cancelled")} className="px-2 py-1 rounded border border-white/10 hover:bg-surface-2">{t("cancel")}</button>
            <button onClick={() => bulkSet("noShow")} className="px-2 py-1 rounded border border-white/10 hover:bg-surface-2">{t("noShow")}</button>
            <button onClick={() => setSelected(new Set())} className="px-2 py-1 text-dim hover:text-foreground">✕</button>
          </div>
        )}
        <table className="w-full text-sm">
          <thead className="bg-surface-2/40 text-[10px] uppercase tracking-widest text-dim">
            <tr>
              <Th><input type="checkbox" checked={bookings.length > 0 && selected.size === bookings.length} onChange={toggleAll} aria-label="select all" /></Th>
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
                      <Td><input type="checkbox" checked={selected.has(b.id)} onChange={() => toggle(b.id)} onClick={(e) => e.stopPropagation()} aria-label="select" /></Td>
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
                      <Check className="size-3.5 me-2" /> {t("confirm")}
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => updateBooking(b.id, { status: "inProgress" })}>
                      <Play className="size-3.5 me-2" /> {t("start")}
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => updateBooking(b.id, { status: "completed" })}>
                      <Check className="size-3.5 me-2" /> {t("complete")}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={() => updateBooking(b.id, { status: "cancelled" })}>
                      <X className="size-3.5 me-2" /> {t("cancel")}
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => updateBooking(b.id, { status: "noShow" })}>
                      <X className="size-3.5 me-2" /> {t("noShow")}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <ContextMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500 focus:text-red-500">
                          <Trash2 className="size-3.5 me-2" /> {t("delete")}
                        </ContextMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("deleteBookingConfirm")}</AlertDialogTitle>
                          <AlertDialogDescription>{t("deleteBookingDesc")}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => { removeBooking(b.id); toast.success(t("deleted")); }}>{t("delete")}</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={8} className="p-0">
                  <EmptyState
                    icon={Calendar}
                    title={t("noData")}
                    description={t("bookings") + " — " + t("add")}
                    action={
                      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest bg-primary text-primary-foreground">
                        <Plus className="size-3.5" /> {t("newBooking")}
                      </button>
                    }
                    className="border-0 rounded-none"
                  />
                </td>
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
