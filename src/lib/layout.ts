import { create } from "zustand";

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
  applyProfileLayout: (layout: Partial<LayoutSnapshot>) => void;
  reset: () => void;
};

export type LayoutSnapshot = {
  mode: ShellMode;
  hiddenItems: RoleMap<string[]>;
  footerEnabled: boolean;
  footerItems: RoleMap<string[]>;
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

export const DEFAULT_LAYOUT: LayoutSnapshot = {
  mode: "sidebar" as ShellMode,
  hiddenItems: { admin: [], user: [] } as RoleMap<string[]>,
  footerEnabled: false,
  footerItems: {
    admin: ["dashboard", "bookings", "customers", "settings"],
    user: ["dashboard", "bookings", "customers"],
  } as RoleMap<string[]>,
};

function mergeRoleMap(current: RoleMap<string[]>, incoming?: Partial<RoleMap<string[]>>) {
  return {
    admin: Array.isArray(incoming?.admin) ? incoming.admin : current.admin,
    user: Array.isArray(incoming?.user) ? incoming.user : current.user,
  };
}

export function snapshotLayout(state: LayoutSnapshot): LayoutSnapshot {
  return {
    mode: state.mode,
    hiddenItems: { admin: [...state.hiddenItems.admin], user: [...state.hiddenItems.user] },
    footerEnabled: state.footerEnabled,
    footerItems: { admin: [...state.footerItems.admin], user: [...state.footerItems.user] },
  };
}

export const useLayout = create<LayoutState>()((set) => ({
  ...DEFAULT_LAYOUT,
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
  applyProfileLayout: (layout) =>
    set((s) => ({
      mode: layout.mode === "topbar" || layout.mode === "sidebar" ? layout.mode : s.mode,
      hiddenItems: mergeRoleMap(s.hiddenItems, layout.hiddenItems),
      footerEnabled: typeof layout.footerEnabled === "boolean" ? layout.footerEnabled : s.footerEnabled,
      footerItems: mergeRoleMap(s.footerItems, layout.footerItems),
    })),
  reset: () => set(DEFAULT_LAYOUT),
}));