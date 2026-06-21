import { describe, it, expect } from "vitest";
import { isStaff, isAdmin, canManageTenants, canViewBranch, canEditModule, visibleBranchesForTenant } from "@/lib/access-policy";

describe("isStaff / isAdmin", () => {
  it("super_admin is staff and admin", () => {
    expect(isStaff("super_admin")).toBe(true);
    expect(isAdmin("super_admin")).toBe(true);
  });
  it("reception is staff but not admin", () => {
    expect(isStaff("reception")).toBe(true);
    expect(isAdmin("reception")).toBe(false);
  });
  it("user is neither", () => {
    expect(isStaff("user")).toBe(false);
    expect(isAdmin("user")).toBe(false);
  });
});

describe("canManageTenants", () => {
  it("only super_admin", () => {
    expect(canManageTenants("super_admin")).toBe(true);
    expect(canManageTenants("admin")).toBe(false);
  });
});

describe("canViewBranch", () => {
  it("super_admin sees any branch", () => {
    expect(canViewBranch("super_admin", [], "b1")).toBe(true);
  });
  it("non-super only sees assigned branches", () => {
    expect(canViewBranch("admin", ["b1"], "b1")).toBe(true);
    expect(canViewBranch("admin", ["b1"], "b2")).toBe(false);
  });
});

describe("canEditModule", () => {
  it("admin-only blocks reception", () => {
    expect(canEditModule("reception", true)).toBe(false);
  });
  it("admin-only allows admin", () => {
    expect(canEditModule("admin", true)).toBe(true);
  });
  it("non-admin module allows any staff", () => {
    expect(canEditModule("staff", false)).toBe(true);
  });
});

describe("visibleBranchesForTenant", () => {
  const branches = [
    { id: "b1", tenantId: "t1" },
    { id: "b2", tenantId: "t2" },
    { id: "b3", tenantId: null },
  ];
  it("returns all when no tenant selected", () => {
    expect(visibleBranchesForTenant(branches, null)).toHaveLength(3);
  });
  it("filters by tenant", () => {
    expect(visibleBranchesForTenant(branches, "t1")).toEqual([{ id: "b1", tenantId: "t1" }]);
  });
  it("excludes unassigned branches when filtering", () => {
    expect(visibleBranchesForTenant(branches, "t2").map((b) => b.id)).toEqual(["b2"]);
  });
});