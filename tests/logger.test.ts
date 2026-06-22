import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger, withLog } from "@/lib/logger";

let logSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  logSpy.mockRestore();
  warnSpy.mockRestore();
  errorSpy.mockRestore();
});

function parseLastCall(spy: ReturnType<typeof vi.spyOn>) {
  const calls = spy.mock.calls;
  return JSON.parse(calls[calls.length - 1][0] as string);
}

describe("logger", () => {
  it("info emits JSON line with level, event, ts and fields to console.log", () => {
    logger.info("evt", { a: 1 });
    const rec = parseLastCall(logSpy);
    expect(rec.level).toBe("info");
    expect(rec.event).toBe("evt");
    expect(rec.a).toBe(1);
    expect(typeof rec.ts).toBe("string");
  });

  it("warn routes to console.warn", () => {
    logger.warn("w");
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(parseLastCall(warnSpy).level).toBe("warn");
  });

  it("error routes to console.error", () => {
    logger.error("e");
    expect(errorSpy).toHaveBeenCalledOnce();
    expect(parseLastCall(errorSpy).level).toBe("error");
  });

  it("debug routes to console.log", () => {
    logger.debug("d");
    expect(parseLastCall(logSpy).level).toBe("debug");
  });
});

describe("withLog", () => {
  it("logs start + ok and returns the result on success", async () => {
    const out = await withLog("op", { id: "x" }, async () => 42);
    expect(out).toBe(42);
    const events = logSpy.mock.calls.map((c) => JSON.parse(c[0] as string).event);
    expect(events).toContain("op.start");
    expect(events).toContain("op.ok");
    const ok = JSON.parse(
      logSpy.mock.calls.find((c) => JSON.parse(c[0] as string).event === "op.ok")![0] as string,
    );
    expect(typeof ok.durationMs).toBe("number");
    expect(ok.id).toBe("x");
  });

  it("logs fail with error message and rethrows", async () => {
    await expect(
      withLog("op", {}, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    const rec = parseLastCall(errorSpy);
    expect(rec.event).toBe("op.fail");
    expect(rec.error).toBe("boom");
    expect(typeof rec.durationMs).toBe("number");
  });

  it("stringifies non-Error throws", async () => {
    await expect(
      withLog("op", {}, async () => {
        throw "nope";
      }),
    ).rejects.toBe("nope");
    expect(parseLastCall(errorSpy).error).toBe("nope");
  });
});