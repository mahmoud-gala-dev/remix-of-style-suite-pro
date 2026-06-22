import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

type Handler = (ev: unknown) => void;

// Re-import fresh module per test so module-level listener state is isolated.
// We stub globalThis.addEventListener BEFORE import so the module registers
// its handlers in our map; we then invoke them directly to simulate events.
async function loadFresh() {
  const handlers = new Map<string, Handler>();
  const original = (globalThis as { addEventListener?: unknown }).addEventListener;
  (globalThis as { addEventListener: unknown }).addEventListener = (
    type: string,
    fn: Handler,
  ) => {
    handlers.set(type, fn);
  };
  vi.resetModules();
  const mod = await import("@/lib/error-capture");
  (globalThis as { addEventListener: unknown }).addEventListener = original as unknown;
  return { mod, handlers };
}

describe("consumeLastCapturedError", () => {
  beforeEach(() => vi.useRealTimers());
  afterEach(() => vi.useRealTimers());

  it("returns undefined when nothing was captured", async () => {
    const { mod } = await loadFresh();
    expect(mod.consumeLastCapturedError()).toBeUndefined();
  });

  it("captures errors from the error handler", async () => {
    const { mod, handlers } = await loadFresh();
    const err = new Error("boom");
    handlers.get("error")!({ error: err });
    expect(mod.consumeLastCapturedError()).toBe(err);
  });

  it("clears after consumption", async () => {
    const { mod, handlers } = await loadFresh();
    handlers.get("error")!({ error: new Error("x") });
    mod.consumeLastCapturedError();
    expect(mod.consumeLastCapturedError()).toBeUndefined();
  });

  it("expires after TTL (5s)", async () => {
    vi.useFakeTimers();
    const { mod, handlers } = await loadFresh();
    handlers.get("error")!({ error: new Error("old") });
    vi.setSystemTime(Date.now() + 6_000);
    expect(mod.consumeLastCapturedError()).toBeUndefined();
  });

  it("captures unhandledrejection reasons", async () => {
    const { mod, handlers } = await loadFresh();
    const reason = { code: "X" };
    handlers.get("unhandledrejection")!({ reason });
    expect(mod.consumeLastCapturedError()).toBe(reason);
  });
});