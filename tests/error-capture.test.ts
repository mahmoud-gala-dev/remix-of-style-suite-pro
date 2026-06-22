import { describe, it, expect, beforeEach, vi } from "vitest";

// Re-import fresh module per test so module-level listener state is isolated.
async function loadFresh() {
  vi.resetModules();
  return await import("@/lib/error-capture");
}

describe("consumeLastCapturedError", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("returns undefined when nothing was captured", async () => {
    const mod = await loadFresh();
    expect(mod.consumeLastCapturedError()).toBeUndefined();
  });

  it("returns the captured error from the global error event", async () => {
    const mod = await loadFresh();
    const err = new Error("boom");
    globalThis.dispatchEvent(new ErrorEvent("error", { error: err }));
    expect(mod.consumeLastCapturedError()).toBe(err);
  });

  it("clears after consumption", async () => {
    const mod = await loadFresh();
    globalThis.dispatchEvent(new ErrorEvent("error", { error: new Error("x") }));
    mod.consumeLastCapturedError();
    expect(mod.consumeLastCapturedError()).toBeUndefined();
  });

  it("expires after TTL (5s)", async () => {
    vi.useFakeTimers();
    const mod = await loadFresh();
    globalThis.dispatchEvent(new ErrorEvent("error", { error: new Error("old") }));
    vi.setSystemTime(Date.now() + 6_000);
    expect(mod.consumeLastCapturedError()).toBeUndefined();
  });

  it("captures unhandledrejection reasons", async () => {
    const mod = await loadFresh();
    const reason = { code: "X" };
    const ev = new Event("unhandledrejection") as Event & { reason?: unknown };
    (ev as { reason: unknown }).reason = reason;
    globalThis.dispatchEvent(ev);
    expect(mod.consumeLastCapturedError()).toBe(reason);
  });
});