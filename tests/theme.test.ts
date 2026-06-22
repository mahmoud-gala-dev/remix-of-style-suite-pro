import { describe, it, expect, beforeEach, afterEach } from "vitest";

// Stub localStorage + window BEFORE importing the module so zustand/persist
// can initialise without throwing in the node test environment.
const _store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => _store.get(k) ?? null,
  setItem: (k: string, v: string) => void _store.set(k, v),
  removeItem: (k: string) => void _store.delete(k),
  clear: () => _store.clear(),
  key: () => null,
  length: 0,
};
if (typeof (globalThis as { window?: unknown }).window === "undefined") {
  (globalThis as { window: unknown }).window = globalThis;
}

const { resolveTheme, useTheme } = await import("@/lib/theme");

describe("resolveTheme", () => {
  const origWindow = globalThis.window;
  afterEach(() => {
    if (origWindow === undefined) {
      // @ts-expect-error reset
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window: unknown }).window = origWindow;
    }
  });

  it("returns dark/light unchanged", () => {
    expect(resolveTheme("dark")).toBe("dark");
    expect(resolveTheme("light")).toBe("light");
  });

  it("falls back to dark when window is unavailable (SSR)", () => {
    // @ts-expect-error simulate SSR
    delete (globalThis as { window?: unknown }).window;
    expect(resolveTheme("system")).toBe("dark");
  });

  it("uses prefers-color-scheme=dark when system + matchMedia matches", () => {
    (globalThis as { window: unknown }).window = {
      matchMedia: () => ({ matches: true }),
    };
    expect(resolveTheme("system")).toBe("dark");
  });

  it("uses light when system + matchMedia does not match dark", () => {
    (globalThis as { window: unknown }).window = {
      matchMedia: () => ({ matches: false }),
    };
    expect(resolveTheme("system")).toBe("light");
  });
});

describe("useTheme store", () => {
  beforeEach(() => useTheme.setState({ mode: "dark" }));

  it("set() updates mode directly", () => {
    useTheme.getState().set("light");
    expect(useTheme.getState().mode).toBe("light");
  });

  it("toggle() cycles dark → system → light → dark", () => {
    useTheme.setState({ mode: "dark" });
    useTheme.getState().toggle();
    expect(useTheme.getState().mode).toBe("system");
    useTheme.getState().toggle();
    expect(useTheme.getState().mode).toBe("light");
    useTheme.getState().toggle();
    expect(useTheme.getState().mode).toBe("dark");
  });
});