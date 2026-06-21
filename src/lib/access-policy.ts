// Pure access-control helpers. Tested in tests/access.test.ts.
export type Role = "super_admin" | "admin" | "reception" | "staff" | "user";

export function isStaff(role: Role): boolean {
  return role === "super_admin" || role === "admin" || role === "reception" || role === "staff";
}

export function isAdmin(role: Role): boolean {
  return role === "super_admin" || role === "admin";
}

export function canManageTenants(role: Role): boolean {
  return role === "super_admin";
}

export function canViewBranch(role: Role, userBranches: string[], branchId: string): boolean {
  if (role === "super_admin") return true;
  return userBranches.includes(branchId);
}

export function canEditModule(role: Role, isAdminOnly: boolean): boolean {
  if (isAdminOnly) return isAdmin(role);
  return isStaff(role);
}

export function visibleBranchesForTenant<T extends { tenantId?: string | null }>(
  branches: T[],
  currentTenantId: string | null,
): T[] {
  if (!currentTenantId) return branches;
  return branches.filter((b) => b.tenantId === currentTenantId);
}