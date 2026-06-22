import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { useData } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { fmtDate, fmtMoney, initials } from "@/lib/format";
import { useMemo, useRef, useState } from "react";
import { Plus, Search, Download, Upload, Phone, MessageCircle, Pencil, Trash2, CalendarPlus, Sparkles, Users } from "lucide-react";
import { EmptyState } from "@/components/shell/empty-state";
import { CustomerDialog } from "@/components/dialogs/customer-dialog";
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
import { parseCsvWithHeader } from "@/lib/csv-parse";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { bulkImportCustomers } from "@/lib/customers.functions";

export const Route = createFileRoute("/_authenticated/customers")({
  ssr: false,
  head: () => ({ meta: [{ title: "Customers" }] }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});

function Page() {
  const t = useT();
  const branchId = useData((s) => s.currentBranchId);
  const allRaw = useData((s) => s.customers);
  const removeCustomer = useData((s) => s.removeCustomer);
  const updateCustomer = useData((s) => s.updateCustomer);
  const all = useMemo(() => allRaw.filter((c) => c.branchId === branchId), [allRaw, branchId]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const importFn = useServerFn(bulkImportCustomers);
  const qc = useQueryClient();

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const rows = parseCsvWithHeader(text);
      const staged = rows
        .map((r) => ({
          name: (r.name ?? r["full name"] ?? "").trim(),
          phone: (r.phone ?? r["phone number"] ?? "").trim(),
          email: (r.email ?? "").trim(),
          notes: (r.notes ?? "").trim(),
        }))
        .filter((r) => r.name && r.phone);
      if (!staged.length) {
        toast.error(t("importNoValidRows"));
        return;
      }
      const res = await importFn({ data: { branchId, rows: staged } });
      await qc.invalidateQueries({ queryKey: ["hydrate"] });
      toast.success(t("importResult").replace("{ok}", String(res.added)).replace("{skip}", String(res.skipped)).replace("{total}", String(res.total)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("importFailed"));
    }
  };

  const list = useMemo(() => {
    if (!q.trim()) return all;
    const lo = q.toLowerCase();
    return all.filter((c) => c.name.toLowerCase().includes(lo) || c.phone.includes(q));
  }, [all, q]);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title={t("customers")}
        subtitle={t("totalCount").replace("{n}", String(all.length))}
        actions={
          <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 border border-border px-3 py-2 rounded-md text-xs font-bold uppercase tracking-widest hover:bg-surface-2/40"
          >
            <Upload className="size-3.5" />
            {t("importBtn")}
          </button>
          <button
            onClick={() =>
              downloadCsv(
                `customers-${Date.now()}.csv`,
                toCsv(list, [
                  { key: "name", label: t("name") },
                  { key: "phone", label: t("phone") },
                  { key: "email", label: t("email") },
                  { key: "visits", label: t("visits") },
                  { key: "totalSpend", label: t("spend") },
                  { key: "points", label: t("points") },
                  { key: "lastVisit", label: t("lastVisit") },
                ]),
              )
            }
            className="inline-flex items-center gap-2 border border-border px-3 py-2 rounded-md text-xs font-bold uppercase tracking-widest hover:bg-surface-2/40"
          >
            <Download className="size-3.5" />
            CSV
          </button>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-xs font-bold uppercase tracking-widest"
          >
            <Plus className="size-3.5" />
            {t("add")}
          </button>
          </div>
        }
      />

      <Surface padded={false}>
        <div className="p-4 border-b border-border">
          <div className="relative max-w-md">
            <Search className="size-3.5 absolute start-3 top-2.5 text-dim" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("search") + "…"}
              className="w-full bg-background border border-border rounded-md ps-9 pe-3 py-2 text-sm outline-none focus:border-primary/50"
            />
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-widest text-dim">
            <tr>
              <Th>{t("customer")}</Th>
              <Th>{t("phone")}</Th>
              <Th>{t("visits")}</Th>
              <Th>{t("spend")}</Th>
              <Th>{t("points")}</Th>
              <Th>{t("lastVisit")}</Th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <ContextMenu key={c.id}>
                <ContextMenuTrigger asChild>
                <tr className="border-t border-border hover:bg-surface-2/30 transition-colors">
                  <Td>
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-surface-2 grid place-items-center text-[10px] font-semibold">
                      {initials(c.name)}
                    </div>
                    <div>
                      <div className="font-medium">{c.name}</div>
                      {c.email && <div className="text-[10px] text-dim">{c.email}</div>}
                    </div>
                  </div>
                  </Td>
                  <Td className="font-mono text-xs text-dim">{c.phone}</Td>
                  <Td className="font-mono">{c.visits}</Td>
                  <Td className="font-mono">{fmtMoney(c.totalSpend)}</Td>
                  <Td>
                  <span className="px-2 py-0.5 rounded-sm bg-primary/10 text-primary text-[10px] font-bold">
                    {c.points} {t("points")}
                  </span>
                  </Td>
                  <Td className="text-dim text-xs">{c.lastVisit ? fmtDate(c.lastVisit) : "—"}</Td>
                </tr>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onSelect={() => window.open(`tel:${c.phone}`)}>
                    <Phone className="size-3.5 me-2" /> {t("call")}
                  </ContextMenuItem>
                  <ContextMenuItem
                    onSelect={() =>
                      window.open(
                        `https://wa.me/${c.phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
                          `Hi ${c.name},`,
                        )}`,
                        "_blank",
                      )
                    }
                  >
                    <MessageCircle className="size-3.5 me-2" /> {t("whatsapp")}
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onSelect={() => updateCustomer(c.id, { points: c.points + 10 })}>
                    <Sparkles className="size-3.5 me-2" /> {t("addTenPoints")}
                  </ContextMenuItem>
                  <ContextMenuItem disabled>
                    <CalendarPlus className="size-3.5 me-2" /> {t("newBookingShort")}
                  </ContextMenuItem>
                  <ContextMenuItem disabled>
                    <Pencil className="size-3.5 me-2" /> {t("edit")}
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
                        <AlertDialogTitle>{t("deleteCustomerConfirm").replace("{name}", c.name)}</AlertDialogTitle>
                        <AlertDialogDescription>{t("deleteCustomerDesc")}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { removeCustomer(c.id); toast.success(t("deleted")); }}>{t("delete")}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </ContextMenuContent>
              </ContextMenu>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="p-0">
                  <EmptyState
                    icon={Users}
                    title={t("noData")}
                    description={t("customers") + " — " + t("add")}
                    action={
                      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest bg-primary text-primary-foreground">
                        <Plus className="size-3.5" /> {t("add")}
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
      <CustomerDialog open={open} onClose={() => setOpen(false)} branchId={branchId} />
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-start px-4 py-3 font-bold">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}
