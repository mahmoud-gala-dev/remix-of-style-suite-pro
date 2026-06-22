import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { getBranchDisplay } from "@/lib/display.functions";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/display/$branch")({
  ssr: false,
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
  const fetchDisplay = useServerFn(getBranchDisplay);
  const lang = useI18n((s) => s.lang);
  const isAr = lang === "ar";
  const { data } = useQuery({
    queryKey: ["branch-display", branch],
    queryFn: () => fetchDisplay({ data: { branchId: branch } }),
    refetchInterval: 5000,
  });

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  if (!data) {
    return <div className="min-h-screen grid place-items-center bg-black text-white">Loading…</div>;
  }

  const statusLabel = (s: string) => {
    if (isAr) return ({ waiting: "في الانتظار", called: "تم النداء", in_progress: "تحت الخدمة", confirmed: "مؤكد", arrived: "وصل" } as Record<string, string>)[s] ?? s;
    return s.replace("_", " ");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-white p-10 font-display">
      <header className="flex items-center justify-between border-b border-white/10 pb-6 mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] opacity-60">{isAr ? "شاشة الطابور" : "Queue Display"}</p>
          <h1 className="text-5xl font-bold mt-2">{isAr ? data.branch.nameAr : data.branch.nameEn}</h1>
        </div>
        <div className="text-end">
          <p className="text-6xl font-bold tabular-nums">{new Date().toLocaleTimeString(isAr ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" })}</p>
          <p className="text-xs opacity-60 mt-2">{new Date().toLocaleDateString(isAr ? "ar-SA" : "en-US", { dateStyle: "full" })}</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-8">
        <section>
          <h2 className="text-2xl mb-4 opacity-80 uppercase tracking-wide">{isAr ? "الطابور الحالي" : "Now serving"}</h2>
          {data.queue.length === 0 ? (
            <p className="text-3xl opacity-40 py-12 text-center">{isAr ? "لا يوجد عملاء في الانتظار" : "Queue is empty"}</p>
          ) : (
            <ul className="space-y-3">
              {data.queue.map((q, i) => (
                <li key={q.id} className={`flex items-center gap-4 rounded-2xl p-5 border ${q.status === "in_progress" ? "bg-emerald-500/15 border-emerald-400/40" : q.status === "called" ? "bg-amber-500/15 border-amber-400/40 animate-pulse" : "bg-white/5 border-white/10"}`}>
                  <div className="text-5xl font-bold tabular-nums w-16 text-center opacity-80">{i + 1}</div>
                  <div className="flex-1">
                    <p className="text-3xl font-semibold">{q.customer}</p>
                    <p className="text-sm opacity-60 mt-1">
                      {q.service ? (isAr ? q.service.ar : q.service.en) : "—"}
                      {q.employee && ` · ${isAr ? q.employee.ar : q.employee.en}`}
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-widest px-3 py-1 rounded-full bg-white/10">{statusLabel(q.status)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-2xl mb-4 opacity-80 uppercase tracking-wide">{isAr ? "حجوزات اليوم" : "Today's bookings"}</h2>
          {data.upcoming.length === 0 ? (
            <p className="text-3xl opacity-40 py-12 text-center">{isAr ? "لا حجوزات" : "No bookings"}</p>
          ) : (
            <ul className="space-y-2">
              {data.upcoming.slice(0, 10).map((b) => (
                <li key={b.id} className="flex items-center gap-4 rounded-xl p-4 bg-white/5 border border-white/10">
                  <div className="text-2xl font-bold tabular-nums w-24">{new Date(b.startAt).toLocaleTimeString(isAr ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" })}</div>
                  <div className="flex-1">
                    <p className="text-xl font-medium">{b.customer}</p>
                    <p className="text-xs opacity-60 mt-0.5">{b.service ? (isAr ? b.service.ar : b.service.en) : "—"}{b.employee && ` · ${isAr ? b.employee.ar : b.employee.en}`}</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest opacity-60">{statusLabel(b.status)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}