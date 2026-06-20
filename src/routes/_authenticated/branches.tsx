import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { useData } from "@/lib/store";
import { useI18n, useT } from "@/lib/i18n";
import { Clock, MapPin, Phone, Plus, Store } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { BranchDialog } from "@/components/dialogs/branch-dialog";

export const Route = createFileRoute("/_authenticated/branches")({
  ssr: false,
  head: () => ({ meta: [{ title: "Branches" }] }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});

function Page() {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const branches = useData((s) => s.branches);
  const setCurrent = useData((s) => s.setCurrentBranch);
  const current = useData((s) => s.currentBranchId);
  const bookings = useData((s) => s.bookings);
  const employees = useData((s) => s.employees);
  const [open, setOpen] = useState(false);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title={t("branches")}
        subtitle={`${branches.length} locations`}
        actions={
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-xs font-bold uppercase tracking-widest"
          >
            <Plus className="size-3.5" />
            {t("newBranch")}
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((b, i) => (
          <motion.button
            key={b.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setCurrent(b.id)}
            className="text-start"
          >
            <Surface
              className={`hover:border-primary/40 transition-colors ${current === b.id ? "border-primary ring-1 ring-primary" : ""}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
                  <Store className="size-5" />
                </div>
                {current === b.id && (
                  <span className="text-[9px] px-2 py-0.5 rounded-sm bg-primary text-primary-foreground font-bold uppercase tracking-widest">
                    Active
                  </span>
                )}
              </div>
              <h3 className="font-display text-lg uppercase tracking-tight">
                {lang === "ar" ? b.nameAr : b.nameEn}
              </h3>
              <p className="text-xs text-dim mt-1 flex items-center gap-1.5">
                <MapPin className="size-3" /> {b.address}
              </p>
              <p className="text-xs text-dim mt-1 flex items-center gap-1.5 font-mono">
                <Phone className="size-3" /> {b.phone}
              </p>
              <p className="text-xs text-dim mt-1 flex items-center gap-1.5 font-mono">
                <Clock className="size-3" /> {b.hoursOpen} – {b.hoursClose}
              </p>
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border">
                <Stat label={t("chairs")} value={b.chairs} />
                <Stat label="Staff" value={employees.filter((e) => e.branchId === b.id).length} />
                <Stat label="Bookings" value={bookings.filter((x) => x.branchId === b.id).length} />
              </div>
            </Surface>
          </motion.button>
        ))}
      </div>
      <BranchDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-widest text-dim">{label}</div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  );
}
