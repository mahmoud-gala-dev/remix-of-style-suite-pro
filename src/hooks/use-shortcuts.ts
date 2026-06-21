import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

// P78 — Keyboard shortcuts. Ignores typing in inputs/textareas.
// Combos use a 1s pending window (e.g. "g b" → Bookings).

function isTyping(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export function useGlobalShortcuts() {
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    let pending: string | null = null;
    let pendingTimer: ReturnType<typeof setTimeout> | null = null;

    const go = (to: string) => () => navigate({ to });

    const handlers: Record<string, () => void> = {
      "/": () => {
        const input = document.querySelector<HTMLInputElement>("input[data-search], input[type=search]");
        if (input) { input.focus(); input.select(); }
      },
      "n": go("/bookings"),
      "?": () => setHelpOpen((o) => !o),
      "g d": go("/"),
      "g b": go("/bookings"),
      "g c": go("/customers"),
      "g q": go("/queue"),
      "g i": go("/invoices"),
      "g r": go("/reports"),
      "g s": go("/settings"),
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target)) {
        if (e.key === "Escape" && e.target instanceof HTMLElement) e.target.blur();
        return;
      }
      const key = e.key;
      if (pending) {
        const combo = `${pending} ${key}`.toLowerCase();
        if (handlers[combo]) {
          e.preventDefault();
          handlers[combo]();
        }
        pending = null;
        if (pendingTimer) clearTimeout(pendingTimer);
        return;
      }
      const single = key.toLowerCase();
      if (single === "g") {
        pending = "g";
        pendingTimer = setTimeout(() => { pending = null; }, 1000);
        return;
      }
      const direct = handlers[key] ?? handlers[single];
      if (direct) {
        e.preventDefault();
        direct();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  return { helpOpen, setHelpOpen };
}

export const SHORTCUT_LIST: Array<{ keys: string; label: string }> = [
  { keys: "/", label: "Focus search" },
  { keys: "N", label: "New booking" },
  { keys: "?", label: "Toggle this help" },
  { keys: "G then D", label: "Go to Dashboard" },
  { keys: "G then B", label: "Go to Bookings" },
  { keys: "G then C", label: "Go to Customers" },
  { keys: "G then Q", label: "Go to Queue" },
  { keys: "G then I", label: "Go to Invoices" },
  { keys: "G then R", label: "Go to Reports" },
  { keys: "G then S", label: "Go to Settings" },
];