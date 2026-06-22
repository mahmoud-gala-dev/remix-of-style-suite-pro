import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { DataState } from "@/components/shell/data-state";
import { useCurrentBranch, useData } from "@/lib/store";
import { useI18n, useT } from "@/lib/i18n";
import {
  listShifts,
  addShift,
  deleteShift,
  addDayOff,
  deleteDayOff,
} from "@/lib/shifts.functions";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/shifts")({
  ssr: false,
  head: () => ({ meta: [{ title: "Shifts" }] }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});

const WEEKDAYS = [
  { en: "Sun", ar: "الأحد" },
  { en: "Mon", ar: "الإثنين" },
  { en: "Tue", ar: "الثلاثاء" },
  { en: "Wed", ar: "الأربعاء" },
  { en: "Thu", ar: "الخميس" },
  { en: "Fri", ar: "الجمعة" },
  { en: "Sat", ar: "السبت" },
];

function Page() {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const branch = useCurrentBranch();
  const employees = useData((s) => s.employees).filter((e) => e.branchId === branch.id);
  const [selected, setSelected] = useState<string | null>(employees[0]?.id ?? null);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader title="Shifts & Days Off" subtitle="Manage per-employee weekly shifts and time off" />
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        <Surface className="p-2">
          <div className="text-[10px] uppercase tracking-widest text-dim px-2 py-2">{t("employees")}</div>
          {employees.map((e) => (
            <button
              key={e.id}
              onClick={() => setSelected(e.id)}
              className={`w-full text-start px-3 py-2 rounded-md text-sm ${
                selected === e.id ? "bg-primary/15 text-foreground" : "hover:bg-surface-2"
              }`}
            >
              {lang === "ar" ? e.nameAr : e.nameEn}
            </button>
          ))}
          {employees.length === 0 && (
            <div className="px-3 py-6 text-xs text-dim">No employees in this branch.</div>
          )}
        </Surface>
        {selected ? <Editor employeeId={selected} lang={lang} /> : null}
      </div>
    </div>
  );
}

function Editor({ employeeId, lang }: { employeeId: string; lang: string }) {
  const qc = useQueryClient();
  const list = useServerFn(listShifts);
  const addS = useServerFn(addShift);
  const delS = useServerFn(deleteShift);
  const addD = useServerFn(addDayOff);
  const delD = useServerFn(deleteDayOff);

  const q = useQuery({
    queryKey: ["shifts", employeeId],
    queryFn: () => list({ data: { employeeId } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["shifts", employeeId] });
  const onErr = (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed");

  const addShiftMut = useMutation({
    mutationFn: (v: { weekday: number; startTime: string; endTime: string }) =>
      addS({ data: { employeeId, ...v } }),
    onSuccess: () => { toast.success("Shift added"); invalidate(); },
    onError: onErr,
  });
  const delShiftMut = useMutation({
    mutationFn: (id: string) => delS({ data: { id } }),
    onSuccess: invalidate,
    onError: onErr,
  });
  const addDayMut = useMutation({
    mutationFn: (v: { day: string; reason?: string }) => addD({ data: { employeeId, ...v } }),
    onSuccess: () => { toast.success("Day off added"); invalidate(); },
    onError: onErr,
  });
  const delDayMut = useMutation({
    mutationFn: (id: string) => delD({ data: { id } }),
    onSuccess: invalidate,
    onError: onErr,
  });

  const [wd, setWd] = useState(1);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [day, setDay] = useState("");
  const [reason, setReason] = useState("");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Surface>
        <div className="text-sm font-semibold mb-3">Weekly shifts</div>
        <DataState query={q}>
          {(data) => (
            <>
              <ul className="space-y-1 mb-4">
                {data.shifts.map((s) => (
                  <li key={s.id} className="flex items-center justify-between text-sm bg-surface-2 rounded-md px-3 py-2">
                    <span>
                      <span className="font-semibold">{lang === "ar" ? WEEKDAYS[s.weekday].ar : WEEKDAYS[s.weekday].en}</span>
                      <span className="text-dim ms-2 font-mono">{s.start_time} – {s.end_time}</span>
                    </span>
                    <button onClick={() => delShiftMut.mutate(s.id)} className="text-dim hover:text-destructive">
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
                {data.shifts.length === 0 && <li className="text-xs text-dim">No shifts.</li>}
              </ul>
              <div className="flex flex-wrap items-center gap-2">
                <select value={wd} onChange={(e) => setWd(Number(e.target.value))} className="bg-surface-2 rounded-md px-2 py-1.5 text-sm">
                  {WEEKDAYS.map((d, i) => (
                    <option key={i} value={i}>{lang === "ar" ? d.ar : d.en}</option>
                  ))}
                </select>
                <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="bg-surface-2 rounded-md px-2 py-1.5 text-sm" />
                <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="bg-surface-2 rounded-md px-2 py-1.5 text-sm" />
                <button
                  disabled={addShiftMut.isPending}
                  onClick={() => addShiftMut.mutate({ weekday: wd, startTime: start, endTime: end })}
                  className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest"
                >
                  <Plus className="size-3.5" /> Add
                </button>
              </div>
            </>
          )}
        </DataState>
      </Surface>

      <Surface>
        <div className="text-sm font-semibold mb-3">Days off</div>
        <DataState query={q}>
          {(data) => (
            <>
              <ul className="space-y-1 mb-4">
                {data.daysOff.map((d) => (
                  <li key={d.id} className="flex items-center justify-between text-sm bg-surface-2 rounded-md px-3 py-2">
                    <span>
                      <span className="font-mono">{d.day}</span>
                      {d.reason && <span className="text-dim ms-2">— {d.reason}</span>}
                    </span>
                    <button onClick={() => delDayMut.mutate(d.id)} className="text-dim hover:text-destructive">
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
                {data.daysOff.length === 0 && <li className="text-xs text-dim">No days off.</li>}
              </ul>
              <div className="flex flex-wrap items-center gap-2">
                <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="bg-surface-2 rounded-md px-2 py-1.5 text-sm" />
                <input
                  placeholder="Reason (optional)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="bg-surface-2 rounded-md px-2 py-1.5 text-sm flex-1 min-w-[120px]"
                />
                <button
                  disabled={!day || addDayMut.isPending}
                  onClick={() => addDayMut.mutate({ day, reason: reason || undefined })}
                  className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                >
                  <Plus className="size-3.5" /> Add
                </button>
              </div>
            </>
          )}
        </DataState>
      </Surface>
    </div>
  );
}