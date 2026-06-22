import { describe, it, expect, vi } from "vitest";
import { withSpan } from "../src/lib/tracing";

describe("withSpan", () => {
  it("returns the wrapped function's value", async () => {
    const out = await withSpan("test.op", { foo: "bar" }, async () => 42);
    expect(out).toBe(42);
  });

  it("propagates errors and still exports", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await expect(
      withSpan("test.fail", {}, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    spy.mockRestore();
  });

  it("emits a trace.span log line", async () => {
    const lines: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((l: string) => {
      lines.push(l);
    });
    await withSpan("test.ok", { tenantId: "t-1" }, async () => "ok");
    spy.mockRestore();
    const traceLine = lines.find((l) => l.includes('"event":"trace.span"'));
    expect(traceLine).toBeDefined();
    const parsed = JSON.parse(traceLine!);
    expect(parsed.name).toBe("test.ok");
    expect(parsed.tenantId).toBe("t-1");
    expect(parsed.status).toBe("ok");
    expect(typeof parsed.traceId).toBe("string");
    expect(parsed.traceId.length).toBe(32);
  });
});