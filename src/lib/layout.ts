import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ShellMode = "sidebar" | "topbar";

type LayoutState = {
  mode: ShellMode;
  hiddenItems: string[];
  footerEnabled: boolean;
  footerItems: string[];
  setMode: (m: ShellMode) => void;
  toggleHidden: (id: string) => void;
  setFooterEnabled: (v: boolean) => void;
  toggleFooterItem: (id: string) => void;
  reset: () => void;
};

const DEFAULTS = {
  mode: "sidebar" as ShellMode,
  hiddenItems: [] as string[],
  footerEnabled: false,
  footerItems: ["dashboard", "bookings", "customers", "settings"] as string[],
};

export const useLayout = create<LayoutState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setMode: (mode) => set({ mode }),
      toggleHidden: (id) =>
        set((s) => ({
          hiddenItems: s.hiddenItems.includes(id)
            ? s.hiddenItems.filter((x) => x !== id)
            : [...s.hiddenItems, id],
        })),
      setFooterEnabled: (footerEnabled) => set({ footerEnabled }),
      toggleFooterItem: (id) =>
        set((s) => ({
          footerItems: s.footerItems.includes(id)
            ? s.footerItems.filter((x) => x !== id)
            : [...s.footerItems, id],
        })),
      reset: () => set(DEFAULTS),
    }),
    { name: "vanguard.layout", storage: createJSONStorage(() => localStorage) },
  ),
);