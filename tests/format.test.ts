import { describe, it, expect, vi, afterEach } from "vitest";
import { fmtMoney, minutesBetween, minutesSince, isToday, initials } from "@/lib/format";

describe("fmtMoney", () => {
  it("uses AED by default and groups thousands", () => {
    expect(fmtMoney(1234.5)).toBe("AED 1,234.5");
  });
  it("respects custom currency code", () => {
    expect(fmtMoney(10, "USD")).toBe("USD 10");
  });
  it("caps to 2 fractional digits", () => {
    expect(fmtMoney(1.239)).toBe("AED 1.24");
  });
});

describe("minutesBetween", () => {
  it("computes whole-minute diff between two ISO timestamps", () => {
    expect(minutesBetween("2026-06-22T10:00:00Z", "2026-06-22T10:45:00Z")).toBe(45);
  });
  it("returns negative when b < a", () => {
    expect(minutesBetween("2026-06-22T10:30:00Z", "2026-06-22T10:00:00Z")).toBe(-30);
  });
});

describe("minutesSince", () => {
  afterEach(() => vi.useRealTimers());
  it("returns minutes from given iso to now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-22T10:30:00Z"));
    expect(minutesSince("2026-06-22T10:00:00Z")).toBe(30);
  });
  it("clamps negative values to 0", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-22T10:00:00Z"));
    expect(minutesSince("2026-06-22T11:00:00Z")).toBe(0);
  });
});

describe("isToday", () => {
  afterEach(() => vi.useRealTimers());
  it("detects same calendar day in local tz", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-22T15:00:00Z"));
    expect(isToday(new Date("2026-06-22T03:00:00Z").toISOString())).toBe(true);
  });
  it("rejects different days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-22T15:00:00Z"));
    expect(isToday(new Date("2026-06-21T15:00:00Z").toISOString())).toBe(false);
  });
});

describe("initials", () => {
  it("takes first two letters of two words", () => {
    expect(initials("Layla Ahmad")).toBe("LA");
  });
  it("uppercases", () => {
    expect(initials("john smith")).toBe("JS");
  });
  it("handles single word", () => {
    expect(initials("Cher")).toBe("C");
  });
  it("strips punctuation/numbers and supports unicode letters", () => {
    expect(initials("Dr. House, MD")).toBe("DH");
    expect(initials("ليلى أحمد")).toBe("لأ");
  });
  it("returns empty for empty input", () => {
    expect(initials("")).toBe("");
    expect(initials("   ")).toBe("");
  });
});