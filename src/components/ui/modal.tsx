import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const maxW = size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-md";

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxW} bg-surface border border-white/10 rounded-lg shadow-2xl`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="font-display text-lg uppercase tracking-tight">{title}</h2>
          <button onClick={onClose} className="text-dim hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-dim">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export const inputCls =
  "w-full bg-surface-2 border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-primary/50";

export function ModalActions({
  onCancel,
  saving,
  saveLabel = "Save",
}: {
  onCancel: () => void;
  saving?: boolean;
  saveLabel?: string;
}) {
  return (
    <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-white/5">
      <button
        type="button"
        onClick={onCancel}
        className="px-3 py-2 text-xs uppercase tracking-widest border border-white/10 rounded-md"
      >
        Cancel
      </button>
      <button
        disabled={saving}
        className="px-3 py-2 text-xs uppercase tracking-widest font-bold bg-primary text-primary-foreground rounded-md disabled:opacity-50"
      >
        {saving ? "…" : saveLabel}
      </button>
    </div>
  );
}