import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { useCurrentBranch, useData } from "@/lib/store";
import { useI18n, useT } from "@/lib/i18n";
import { initials } from "@/lib/format";
import { Phone, Plus, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/employees")({
  ssr: false,
  head: () => ({ meta: [{ title: "Employees" }] }),
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
  const list = useData((s) => s.employees).filter((x) => x.branchId === branch.id);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title={t("employees")}
        subtitle={`${list.length} on staff`}
        actions={
          <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-xs font-bold uppercase tracking-widest">
            <Plus className="size-3.5" />
            {t("add")}
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((e) => (
          <Surface key={e.id} className="hover:border-primary/40 transition-colors">
            <div className="flex items-center gap-4 mb-4">
              <div className="size-14 rounded-full bg-surface-2 grid place-items-center text-sm font-semibold ring-1 ring-white/5">
                {initials(e.nameEn)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{lang === "ar" ? e.nameAr : e.nameEn}</h3>
                <p className="text-[10px] text-dim uppercase tracking-widest mt-0.5 capitalize">{e.role}</p>
              </div>
              <div className="flex items-center gap-1 text-primary text-sm font-mono">
                <Star className="size-3.5 fill-primary" />
                {e.rating.toFixed(1)}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-dim">
                <Phone className="size-3" />
                <span className="font-mono">{e.phone}</span>
              </div>
              <span className="text-dim">
                {t("commission")}: <span className="text-foreground font-mono">{e.commissionPct}%</span>
              </span>
            </div>
          </Surface>
        ))}
      </div>
    </div>
  );
}
