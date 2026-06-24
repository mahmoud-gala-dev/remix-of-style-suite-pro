import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { DataState } from "@/components/shell/data-state";
import { Input } from "@/components/ui/input";
import { useCurrentBranch } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { RouteError, RouteNotFound } from "@/components/shell/route-error";
import { Search, CalendarDays, Receipt, Star, Sparkles } from "lucide-react";
import { getCustomerTimeline, listBranchCustomers } from "@/lib/crm-timeline.functions";

export const Route = createFileRoute("/_authenticated/crm")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  ssr: false,
  head: () => ({ meta: [{ title: "CRM Timeline" }] }),
  component: () => (<AppShell><Page /></AppShell>),
});

function Page() {
  const t = useT();
  const branch = useCurrentBranch();
  const listFn = useServerFn(listBranchCustomers);
  const timelineFn = useServerFn(getCustomerTimeline);

  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const customersQ = useQuery({
    queryKey: ["crm.customers", branch.id],
    queryFn: () => listFn({ data: { branchId: branch.id } }),
  });

  const filtered = useMemo(() => {
    const items = customersQ.data ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (c) =>
        c.name?.toLowerCase().includes(term) ||
        c.phone?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term),
    );
  }, [customersQ.data, q]);

  const timelineQ = useQuery({
    queryKey: ["crm.timeline", selected],
    queryFn: () => timelineFn({ data: { customerId: selected! } }),
    enabled: !!selected,
  });

  return (
    <>
      <PageHeader title={t("crm_timeline")} subtitle={t("crm_timeline_sub")} />
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <Surface className="p-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("search")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-8"
            />
          </div>
          <DataState
            isLoading={customersQ.isLoading}
            isError={customersQ.isError}
            isEmpty={!filtered.length}
          >
            <ul className="max-h-[70vh] overflow-y-auto divide-y">
              {filtered.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setSelected(c.id)}
                    className={`w-full text-left px-2 py-2 hover:bg-accent rounded ${
                      selected === c.id ? "bg-accent" : ""
                    }`}
                  >
                    <div className="font-medium text-sm">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.phone || c.email}</div>
                  </button>
                </li>
              ))}
            </ul>
          </DataState>
        </Surface>

        <Surface className="p-4">
          {!selected ? (
            <div className="text-sm text-muted-foreground py-12 text-center">
              {t("crm_select_customer")}
            </div>
          ) : (
            <DataState
              isLoading={timelineQ.isLoading}
              isError={timelineQ.isError}
              isEmpty={!timelineQ.data?.events.length}
            >
              {timelineQ.data && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Stat label={t("total_spend")} value={timelineQ.data.stats.totalSpend.toFixed(2)} />
                    <Stat label={t("bookings")} value={String(timelineQ.data.stats.bookingCount)} />
                    <Stat label={t("no_shows")} value={String(timelineQ.data.stats.noShowCount)} />
                    <Stat
                      label={t("avg_rating")}
                      value={
                        timelineQ.data.stats.avgRating != null
                          ? timelineQ.data.stats.avgRating.toFixed(1)
                          : "—"
                      }
                    />
                  </div>
                  <ol className="relative border-l ms-3 space-y-3">
                    {timelineQ.data.events.map((ev) => (
                      <li key={ev.id} className="ms-4">
                        <span className="absolute -start-2 mt-1.5 h-3 w-3 rounded-full bg-primary" />
                        <div className="flex items-center gap-2 text-sm">
                          <Icon type={ev.type} />
                          <span className="font-medium">{ev.title}</span>
                          {ev.status && (
                            <span className="text-xs px-2 py-0.5 rounded bg-muted">{ev.status}</span>
                          )}
                          {ev.amount != null && (
                            <span className="ms-auto text-sm">{ev.amount.toFixed(2)}</span>
                          )}
                        </div>
                        {ev.subtitle && (
                          <div className="text-xs text-muted-foreground mt-0.5">{ev.subtitle}</div>
                        )}
                        <div className="text-[11px] text-muted-foreground">
                          {new Date(ev.at).toLocaleString()}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </DataState>
          )}
        </Surface>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function Icon({ type }: { type: "booking" | "invoice" | "review" | "points" }) {
  const cls = "h-4 w-4 text-muted-foreground";
  if (type === "booking") return <CalendarDays className={cls} />;
  if (type === "invoice") return <Receipt className={cls} />;
  if (type === "review") return <Star className={cls} />;
  return <Sparkles className={cls} />;
}