import { describe, it, expect } from "vitest";
import { addInterval, expandRecurrence } from "@/lib/recurring";

const d = (iso: string) => new Date(iso);

describe("addInterval", () => {
  it("adds 7 days for weekly", () => {
    expect(addInterval(d("2026-06-22T10:00:00Z"), "weekly", 2).toISOString()).toBe("2026-07-06T10:00:00.000Z");
  });
  it("adds 14 days for biweekly", () => {
    expect(addInterval(d("2026-06-22T10:00:00Z"), "biweekly", 1).toISOString()).toBe("2026-07-06T10:00:00.000Z");
  });
  it("adds N months for monthly", () => {
    expect(addInterval(d("2026-01-15T10:00:00Z"), "monthly", 3).toISOString()).toBe("2026-04-15T10:00:00.000Z");
  });
  it("returns equivalent date when n=0", () => {
    const base = d("2026-06-22T10:00:00Z");
    expect(addInterval(base, "weekly", 0).getTime()).toBe(base.getTime());
  });
});

describe("expandRecurrence", () => {
  const start = d("2026-06-22T10:00:00Z");
  const end = d("2026-06-22T11:00:00Z"); // 1h

  it("returns `occurrences` instances", () => {
    expect(expandRecurrence(start, end, "weekly", 4)).toHaveLength(4);
  });

  it("preserves duration across instances", () => {
    const out = expandRecurrence(start, end, "weekly", 3);
    for (const inst of out) {
      expect(inst.end.getTime() - inst.start.getTime()).toBe(60 * 60 * 1000);
    }
  });

  it("starts at the original startAt for i=0", () => {
    const out = expandRecurrence(start, end, "monthly", 2);
    expect(out[0].start.toISOString()).toBe(start.toISOString());
  });

  it("steps biweekly correctly", () => {
    const out = expandRecurrence(start, end, "biweekly", 3);
    expect(out.map((i) => i.start.toISOString())).toEqual([
      "2026-06-22T10:00:00.000Z",
      "2026-07-06T10:00:00.000Z",
      "2026-07-20T10:00:00.000Z",
    ]);
  });
});