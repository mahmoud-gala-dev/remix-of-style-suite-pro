import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ShellMode = "sidebar" | "topbar";
export type RoleKind = "admin" | "user";

type RoleMap<T> = { admin: T; user: T };

type LayoutState = {
  mode: ShellMode;
  hiddenItems: RoleMap<string[]>;
  footerEnabled: boolean;
  footerItems: RoleMap<string[]>;
  setMode: (m: ShellMode) => void;
  toggleHidden: (role: RoleKind, id: string) => void;
  setFooterEnabled: (v: boolean) => void;
  toggleFooterItem: (role: RoleKind, id: string) => void;
  reset: () => void;
};

// Items that ONLY admins can ever see. Non-admins never see these regardless
// of saved preferences.
export const ADMIN_ONLY_MODULES = new Set([
  "settings",
  "branches",
  "employees",
  "reports",
  "docs",
  "invoices",
  "memberships",
  "coupons",
]);

const DEFAULTS = {
  mode: "sidebar" as ShellMode,
  hiddenItems: { admin: [], user: [] } as RoleMap<string[]>,
  footerEnabled: false,
  footerItems: {
    admin: ["dashboard", "bookings", "customers", "settings"],
    user: ["dashboard", "bookings", "customers"],
  } as RoleMap<string[]>,
};

export const useLayout = create<LayoutState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setMode: (mode) => set({ mode }),
      toggleHidden: (role, id) =>
        set((s) => ({
          hiddenItems: {
            ...s.hiddenItems,
            [role]: s.hiddenItems[role].includes(id)
              ? s.hiddenItems[role].filter((x) => x !== id)
              : [...s.hiddenItems[role], id],
          },
        })),
      setFooterEnabled: (footerEnabled) => set({ footerEnabled }),
      toggleFooterItem: (role, id) =>
        set((s) => ({
          footerItems: {
            ...s.footerItems,
            [role]: s.footerItems[role].includes(id)
              ? s.footerItems[role].filter((x) => x !== id)
              : [...s.footerItems[role], id],
          },
        })),
      reset: () => set(DEFAULTS),
    }),
    { name: "vanguard.layout", version: 2, storage: createJSONStorage(() => localStorage) },
  ),
);