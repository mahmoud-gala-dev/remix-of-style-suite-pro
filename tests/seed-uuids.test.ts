import { describe, it, expect } from "vitest";
import {
  seedBranches,
  seedServices,
  seedEmployees,
  seedCustomers,
  seedBookings,
  seedQueue,
} from "@/lib/seed";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("seed data uses RFC-4122 UUIDs (debt #15)", () => {
  it.each([
    ["branches", seedBranches],
    ["services", seedServices],
    ["employees", seedEmployees],
    ["customers", seedCustomers],
    ["bookings", seedBookings],
    ["queue", seedQueue],
  ])("%s entity ids are UUIDs", (_name, rows) => {
    for (const r of rows) expect(r.id).toMatch(UUID_RE);
  });

  it("cross-references resolve and are UUIDs", () => {
    const branchIds = new Set(seedBranches.map((b) => b.id));
    const customerIds = new Set(seedCustomers.map((c) => c.id));
    const employeeIds = new Set(seedEmployees.map((e) => e.id));
    const serviceIds = new Set(seedServices.map((s) => s.id));

    for (const b of seedBookings) {
      expect(branchIds.has(b.branchId)).toBe(true);
      expect(customerIds.has(b.customerId)).toBe(true);
      expect(employeeIds.has(b.employeeId)).toBe(true);
      expect(serviceIds.has(b.serviceId)).toBe(true);
    }
    for (const e of seedEmployees) expect(branchIds.has(e.branchId)).toBe(true);
    for (const s of seedServices) expect(branchIds.has(s.branchId)).toBe(true);
    for (const c of seedCustomers) expect(branchIds.has(c.branchId)).toBe(true);
  });
});