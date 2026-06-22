import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DocsNav } from "./docs/-DocsNav";
import { DocsTimeline } from "./docs/-DocsTimeline";
import { MODULES } from "./docs/-modules-data";
import { RouteError, RouteNotFound } from "@/components/shell/route-error";

export const Route = createFileRoute("/_authenticated/docs")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: DocsPage,
});

function DocsPage() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return MODULES;
    return MODULES.filter(
      (m) =>
        m.title.toLowerCase().includes(s) ||
        m.description.toLowerCase().includes(s) ||
        (m.table?.toLowerCase().includes(s) ?? false),
    );
  }, [q]);

  return (
    <div dir="rtl" className="min-h-screen">
      <DocsNav q={q} onQueryChange={setQ} />
      <div className="px-6 md:px-12 py-16 max-w-6xl mx-auto">
        <DocsTimeline items={filtered} />
        <div className="mt-16 text-center text-xs text-muted-foreground">
          نظام Vanguard Salon OS — توثيق محدّث تلقائياً مع كل وحدة جديدة.
        </div>
      </div>
    </div>
  );
}
