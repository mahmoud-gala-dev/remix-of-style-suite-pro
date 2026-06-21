import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type ThemeMode = "dark" | "light" | "system";

type ThemeState = {
  mode: ThemeMode;
  toggle: () => void;
  set: (m: ThemeMode) => void;
};

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: "dark",
      toggle: () => {
        const order: ThemeMode[] = ["light", "dark", "system"];
        const i = order.indexOf(get().mode);
        set({ mode: order[(i + 1) % order.length] });
      },
      set: (mode) => set({ mode }),
    }),
    {
      name: "vanguard.theme",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : (undefined as never),
      ),
      skipHydration: typeof window === "undefined",
    },
  ),
);

export function resolveTheme(mode: ThemeMode): "dark" | "light" {
  if (mode !== "system") return mode;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
