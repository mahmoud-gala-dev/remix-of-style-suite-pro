import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type ThemeMode = "dark" | "light";

type ThemeState = {
  mode: ThemeMode;
  toggle: () => void;
  set: (m: ThemeMode) => void;
};

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: "dark",
      toggle: () => set({ mode: get().mode === "dark" ? "light" : "dark" }),
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
