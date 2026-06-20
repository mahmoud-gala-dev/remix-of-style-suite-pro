import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { useData } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { fmtDate, fmtMoney, initials } from "@/lib/format";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";

export const Route = createFileRoute("/customers")({
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
  const all = useMemo(() => allRaw.filter((c) => c.branchId === branchId), [allRaw, branchId]);
  const [q, setQ] = useState("");

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
          <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-xs font-bold uppercase tracking-widest">
            <Plus className="size-3.5" />
            {t("add")}
          </button>
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
              <tr key={c.id} className="border-t border-border hover:bg-surface-2/30 transition-colors">
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
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="p-12 text-center text-sm text-dim">{t("noData")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </Surface>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-start px-4 py-3 font-bold">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}
