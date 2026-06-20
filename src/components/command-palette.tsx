import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useData } from "@/lib/store";
import { useI18n } from "@/lib/i18n";

type Cmd = {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const setLang = useI18n((s) => s.setLang);
  const branches = useData((s) => s.branches);
  const customers = useData((s) => s.customers);
  const services = useData((s) => s.services);
  const setBranch = useData((s) => s.setCurrentBranch);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const close = () => { setOpen(false); setQ(""); };

  const cmds = useMemo<Cmd[]>(() => {
    const nav = (to: string, label: string): Cmd => ({
      id: `nav:${to}`, label, hint: "Go to", run: () => { navigate({ to }); close(); },
    });
    const base: Cmd[] = [
      nav("/", "Dashboard"),
      nav("/calendar", "Calendar"),
      nav("/bookings", "Bookings"),
      nav("/queue", "Queue"),
      nav("/customers", "Customers"),
      nav("/services", "Services"),
      nav("/employees", "Employees"),
      nav("/branches", "Branches"),
      nav("/reports", "Reports"),
      nav("/settings", "Settings"),
      { id: "lang:en", label: "Switch language: English", run: () => { setLang("en"); close(); } },
      { id: "lang:ar", label: "Switch language: العربية", run: () => { setLang("ar"); close(); } },
    ];
    const branchCmds: Cmd[] = branches.map((b) => ({
      id: `branch:${b.id}`, label: `Switch branch: ${b.nameEn}`, hint: "Branch",
      run: () => { setBranch(b.id); close(); },
    }));
    const customerCmds: Cmd[] = customers.slice(0, 50).map((c) => ({
      id: `cust:${c.id}`, label: c.name, hint: "Customer",
      run: () => { navigate({ to: "/customers" }); close(); },
    }));
    const serviceCmds: Cmd[] = services.slice(0, 50).map((s) => ({
      id: `svc:${s.id}`, label: s.nameEn, hint: "Service",
      run: () => { navigate({ to: "/services" }); close(); },
    }));
    return [...base, ...branchCmds, ...customerCmds, ...serviceCmds];
  }, [branches, customers, services, navigate, setLang, setBranch]);

  const filtered = useMemo(() => {
    if (!q.trim()) return cmds.slice(0, 12);
    const lo = q.toLowerCase();
    return cmds.filter((c) => c.label.toLowerCase().includes(lo)).slice(0, 30);
  }, [q, cmds]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-start pt-[12vh] bg-black/60 p-4" onClick={close}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xl bg-surface border border-white/10 rounded-lg shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <Search className="size-4 text-dim" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent outline-none text-sm"
          />
          <kbd className="text-[10px] text-dim border border-white/10 rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <ul className="max-h-[60vh] overflow-y-auto">
          {filtered.map((c) => (
            <li key={c.id}>
              <button
                onClick={c.run}
                className="w-full text-start px-4 py-2.5 text-sm hover:bg-surface-2 flex items-center justify-between"
              >
                <span>{c.label}</span>
                {c.hint && <span className="text-[10px] uppercase tracking-widest text-dim">{c.hint}</span>}
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-center text-xs text-dim">No matches</li>
          )}
        </ul>
      </div>
    </div>
  );
}