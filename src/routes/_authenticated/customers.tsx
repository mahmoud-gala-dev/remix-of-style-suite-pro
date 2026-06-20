import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { useData } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { fmtDate, fmtMoney, initials } from "@/lib/format";
import { useMemo, useState } from "react";
import { Plus, Search, Download, Phone, MessageCircle, Pencil, Trash2, CalendarPlus, Sparkles } from "lucide-react";
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
import { toast } from "sonner";

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

  const list = useMemo(() => {
    if (!q.trim()) return all;
    const lo = q.toLowerCase();
    return all.filter((c) => c.name.toLowerCase().includes(lo) || c.phone.includes(q));
  }, [all, q]);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title={t("customers")}
        subtitle={`${all.length} total`}
        actions={
          <div className="flex items-center gap-2">
          <button
            onClick={() =>
              downloadCsv(
                `customers-${Date.now()}.csv`,
                toCsv(list, [
                  { key: "name", label: "Name" },
                  { key: "phone", label: "Phone" },
                  { key: "email", label: "Email" },
                  { key: "visits", label: "Visits" },
                  { key: "totalSpend", label: "Spend" },
                  { key: "points", label: "Points" },
                  { key: "lastVisit", label: "Last Visit" },
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
                    {c.points} pts
                  </span>
                  </Td>
                  <Td className="text-dim text-xs">{c.lastVisit ? fmtDate(c.lastVisit) : "—"}</Td>
                </tr>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onSelect={() => window.open(`tel:${c.phone}`)}>
                    <Phone className="size-3.5 me-2" /> Call
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
                    <MessageCircle className="size-3.5 me-2" /> WhatsApp
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onSelect={() => updateCustomer(c.id, { points: c.points + 10 })}>
                    <Sparkles className="size-3.5 me-2" /> +10 points
                  </ContextMenuItem>
                  <ContextMenuItem disabled>
                    <CalendarPlus className="size-3.5 me-2" /> New booking
                  </ContextMenuItem>
                  <ContextMenuItem disabled>
                    <Pencil className="size-3.5 me-2" /> Edit
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <ContextMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500 focus:text-red-500">
                        <Trash2 className="size-3.5 me-2" /> Delete
                      </ContextMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {c.name}?</AlertDialogTitle>
                        <AlertDialogDescription>This removes the customer from this device's current list.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { removeCustomer(c.id); toast.success("Deleted"); }}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </ContextMenuContent>
              </ContextMenu>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="p-12 text-center text-sm text-dim">{t("noData")}</td>
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
