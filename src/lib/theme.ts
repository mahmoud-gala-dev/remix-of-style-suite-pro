import { create } from "zustand";

type ThemeMode = "dark" | "light";

type ThemeState = {
  mode: ThemeMode;
  toggle: () => void;
  set: (m: ThemeMode) => void;
};

export const useTheme = create<ThemeState>()((set, get) => ({
  mode: "dark",
  toggle: () => set({ mode: get().mode === "dark" ? "light" : "dark" }),
  set: (mode) => set({ mode }),
}));
