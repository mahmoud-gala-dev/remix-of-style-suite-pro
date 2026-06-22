import { describe, it, expect } from "vitest";
import { aggregateReports, percentDelta, previousPeriod } from "@/lib/reports-aggregate";

const branches = [
  { id: "b1", name_en: "Downtown Studio", name_ar: "وسط" },
  { id: "b2", name_en: "Mall Branch", name_ar: "المول" },
];
const services = [
  { id: "s1", name_en: "Cut", name_ar: "قص" },
  { id: "s2", name_en: "Color", name_ar: "صبغ" },
];
const bookings = [
  { branch_id: "b1", service_id: "s1", status: "completed",   price: 100, start_at: "2026-06-22T10:00:00Z" },
  { branch_id: "b1", service_id: "s1", status: "completed",   price: 50,  start_at: "2026-06-22T11:00:00Z" },
  { branch_id: "b1", service_id: "s2", status: "in_progress", price: 200, start_at: "2026-06-23T14:00:00Z" },
  { branch_id: "b2", service_id: "s2", status: "cancelled",   price: 999, start_at: "2026-06-23T09:00:00Z" },
  { branch_id: "b2", service_id: "s1", status: "pending",     price: 80,  start_at: "2026-06-22T16:00:00Z" },
];

const from = new Date("2026-06-22T00:00:00Z");
const toExclusive = new Date("2026-06-24T00:00:00Z");

describe("aggregateReports", () => {
  const out = aggregateReports({ bookings, branches, services, from, toExclusive });

  it("totals bookings and revenue (only completed + in_progress count)", () => {
    expect(out.totals.bookings).toBe(5);
    expect(out.totals.revenue).toBe(100 + 50 + 200);
    expect(out.totals.branches).toBe(2);
  });

  it("computes per-branch revenue", () => {
    const b1 = out.byBranch.find((b) => b.id === "b1")!;
    const b2 = out.byBranch.find((b) => b.id === "b2")!;
    expect(b1.revenue).toBe(350);
    expect(b2.revenue).toBe(0);
    expect(b1.name).toBe("Downtown"); // first word of name_en
  });

  it("counts statuses in fixed order", () => {
    const map = Object.fromEntries(out.byStatus.map((s) => [s.name, s.value]));
    expect(map.completed).toBe(2);
    expect(map.inProgress).toBe(1);
    expect(map.cancelled).toBe(1);
    expect(map.pending).toBe(1);
  });

  it("builds a trend point per day in the range", () => {
    expect(out.trend).toHaveLength(2);
    expect(out.trend[0].bookings).toBe(3); // 2026-06-22
    expect(out.trend[0].revenue).toBe(150);
    expect(out.trend[1].bookings).toBe(2); // 2026-06-23
    expect(out.trend[1].revenue).toBe(200);
  });

  it("ranks top services by booking count", () => {
    expect(out.topServices[0].id).toBe("s1");
    expect(out.topServices[0].count).toBe(3);
    expect(out.topServices[0].nameEn).toBe("Cut");
  });

  it("filters byBranch when branchId is provided", () => {
    const scoped = aggregateReports({ bookings, branches, services, from, toExclusive, branchId: "b1" });
    expect(scoped.byBranch).toHaveLength(1);
    expect(scoped.byBranch[0].id).toBe("b1");
  });
});

describe("percentDelta", () => {
  it("rounds standard movement", () => {
    expect(percentDelta(120, 100)).toBe(20);
    expect(percentDelta(80, 100)).toBe(-20);
  });
  it("returns 0 when both are zero", () => {
    expect(percentDelta(0, 0)).toBe(0);
  });
  it("returns 100 when prev is zero and cur > 0", () => {
    expect(percentDelta(42, 0)).toBe(100);
  });
  it("rounds to nearest integer", () => {
    expect(percentDelta(101, 99)).toBe(2);
    expect(percentDelta(98, 99)).toBe(-1);
  });
});

describe("previousPeriod", () => {
  it("returns an equal-length range ending at the current start", () => {
    const cur = {
      from: new Date("2026-06-15T00:00:00Z"),
      toExclusive: new Date("2026-06-22T00:00:00Z"), // 7 days
    };
    const prev = previousPeriod(cur);
    expect(prev.toExclusive.toISOString()).toBe(cur.from.toISOString());
    expect(prev.toExclusive.getTime() - prev.from.getTime()).toBe(cur.toExclusive.getTime() - cur.from.getTime());
    expect(prev.from.toISOString()).toBe("2026-06-08T00:00:00.000Z");
  });
});