import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { useCurrentBranch, useData } from "@/lib/store";
import { useI18n, useT } from "@/lib/i18n";
import { fmtMoney } from "@/lib/format";
import { Clock, Plus, Users } from "lucide-react";

export const Route = createFileRoute("/services")({
  ssr: false,
  head: () => ({ meta: [{ title: "Services" }] }),
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
  const list = useData((s) => s.services).filter((x) => x.branchId === branch.id);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title={t("services")}
        subtitle={`${list.length} ${t("services").toLowerCase()}`}
        actions={
          <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-xs font-bold uppercase tracking-widest">
            <Plus className="size-3.5" />
            {t("add")}
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((s) => (
          <Surface key={s.id} className="hover:border-primary/40 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold">{lang === "ar" ? s.nameAr : s.nameEn}</h3>
                <p className="text-[10px] text-dim uppercase tracking-widest mt-0.5">{s.category}</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-sm bg-surface-2 text-dim uppercase font-bold">
                {t(s.gender)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-dim">
                <Clock className="size-3.5" />
                <span className="font-mono">{s.durationMin}m</span>
              </div>
              <span className="font-display text-2xl">{fmtMoney(s.price)}</span>
            </div>
          </Surface>
        ))}
        {list.length === 0 && (
          <Surface className="col-span-full">
            <p className="text-center text-sm text-dim py-8">{t("noData")}</p>
          </Surface>
        )}
      </div>
    </div>
  );
}
