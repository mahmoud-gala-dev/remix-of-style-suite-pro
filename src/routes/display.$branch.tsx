import { createFileRoute, useParams, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { getBranchDisplay } from "@/lib/display.functions";
import { useI18n } from "@/lib/i18n";

const searchSchema = z.object({
  theme: z.enum(["dark", "light"]).optional(),
  accent: z.string().regex(/^[0-9a-fA-F]{6}$/).optional(),
});

export const Route = createFileRoute("/display/$branch")({
  ssr: false,
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Queue Display" }] }),
  component: DisplayScreen,
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center bg-black text-white p-8 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Display unavailable</h1>
        <p className="mt-2 text-sm opacity-70">{error.message}</p>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center bg-black text-white">
      <p>Branch not found</p>
    </div>
  ),
});

function DisplayScreen() {
  const { branch } = useParams({ from: "/display/$branch" });
  const { theme = "dark", accent } = useSearch({ from: "/display/$branch" });
  const fetchDisplay = useServerFn(getBranchDisplay);
  const lang = useI18n((s) => s.lang);
  const isAr = lang === "ar";
  const { data } = useQuery({
    queryKey: ["branch-display", branch],
    queryFn: () => fetchDisplay({ data: { branchId: branch } }),
    refetchInterval: 5000,
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  if (!data) {
    return <div className="min-h-screen grid place-items-center bg-background text-foreground">Loading…</div>;
  }

  const statusLabel = (s: string) => {
    if (isAr) return ({ waiting: "في الانتظار", called: "تم النداء", in_progress: "تحت الخدمة", confirmed: "مؤكد", arrived: "وصل" } as Record<string, string>)[s] ?? s;
    return s.replace("_", " ");
  };

  const accentStyle = accent ? ({ ["--primary" as string]: `#${accent}` } as React.CSSProperties) : undefined;

  return (
    <div className="min-h-screen bg-background text-foreground p-10 font-display" style={accentStyle}>
      <header className="flex items-center justify-between border-b border-border pb-6 mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-dim">{isAr ? "شاشة الطابور" : "Queue Display"}</p>
          <h1 className="text-5xl font-bold mt-2">{isAr ? data.branch.nameAr : data.branch.nameEn}</h1>
        </div>
        <div className="text-end">
          <p className="text-6xl font-bold tabular-nums">{new Date().toLocaleTimeString(isAr ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" })}</p>
          <p className="text-xs text-dim mt-2">{new Date().toLocaleDateString(isAr ? "ar-SA" : "en-US", { dateStyle: "full" })}</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-8">
        <section>
          <h2 className="text-2xl mb-4 text-dim uppercase tracking-wide">{isAr ? "الطابور الحالي" : "Now serving"}</h2>
          {data.queue.length === 0 ? (
            <p className="text-3xl text-dim py-12 text-center">{isAr ? "لا يوجد عملاء في الانتظار" : "Queue is empty"}</p>
          ) : (
            <ul className="space-y-3">
              {data.queue.map((q, i) => (
                <li key={q.id} className={`flex items-center gap-4 rounded-2xl p-5 border ${q.status === "in_progress" ? "bg-primary/15 border-primary/40" : q.status === "called" ? "bg-warning/15 border-warning/40 animate-pulse" : "bg-surface border-border"}`}>
                  <div className="text-5xl font-bold tabular-nums w-16 text-center text-dim">{i + 1}</div>
                  <div className="flex-1">
                    <p className="text-3xl font-semibold">{q.customer}</p>
                    <p className="text-sm text-dim mt-1">
                      {q.service ? (isAr ? q.service.ar : q.service.en) : "—"}
                      {q.employee && ` · ${isAr ? q.employee.ar : q.employee.en}`}
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-widest px-3 py-1 rounded-full bg-surface-2">{statusLabel(q.status)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-2xl mb-4 text-dim uppercase tracking-wide">{isAr ? "حجوزات اليوم" : "Today's bookings"}</h2>
          {data.upcoming.length === 0 ? (
            <p className="text-3xl text-dim py-12 text-center">{isAr ? "لا حجوزات" : "No bookings"}</p>
          ) : (
            <ul className="space-y-2">
              {data.upcoming.slice(0, 10).map((b) => (
                <li key={b.id} className="flex items-center gap-4 rounded-xl p-4 bg-surface border border-border">
                  <div className="text-2xl font-bold tabular-nums w-24">{new Date(b.startAt).toLocaleTimeString(isAr ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" })}</div>
                  <div className="flex-1">
                    <p className="text-xl font-medium">{b.customer}</p>
                    <p className="text-xs text-dim mt-0.5">{b.service ? (isAr ? b.service.ar : b.service.en) : "—"}{b.employee && ` · ${isAr ? b.employee.ar : b.employee.en}`}</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-dim">{statusLabel(b.status)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}