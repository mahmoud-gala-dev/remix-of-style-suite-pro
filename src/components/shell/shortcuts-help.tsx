import { SHORTCUT_LIST } from "@/hooks/use-shortcuts";
import { X } from "lucide-react";

export function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="bg-surface border border-border rounded-lg shadow-xl w-full max-w-md p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em]">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="text-dim hover:text-foreground" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        <ul className="space-y-2 text-sm">
          {SHORTCUT_LIST.map((s) => (
            <li key={s.keys} className="flex items-center justify-between gap-4">
              <span className="text-dim">{s.label}</span>
              <kbd className="font-mono text-xs px-2 py-1 bg-surface-2 border border-border rounded">{s.keys}</kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}