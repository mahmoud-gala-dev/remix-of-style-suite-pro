import { describe, it, expect } from "vitest";
import { requireAdmin } from "../src/lib/require-admin";

function mockCtx(adminData: unknown, superData: unknown) {
  return {
    userId: "user-1",
    supabase: {
      rpc: (_fn: string, args: { _role: string }) =>
        Promise.resolve({ data: args._role === "admin" ? adminData : superData }),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("requireAdmin", () => {
  it("resolves when caller has admin role", async () => {
    await expect(requireAdmin(mockCtx(true, false))).resolves.toBeUndefined();
  });

  it("resolves when caller has super_admin role", async () => {
    await expect(requireAdmin(mockCtx(false, true))).resolves.toBeUndefined();
  });

  it("throws 403 Response when caller has neither role", async () => {
    let caught: unknown;
    try {
      await requireAdmin(mockCtx(false, false));
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Response);
    expect((caught as Response).status).toBe(403);
  });

  it("treats null rpc data as denial", async () => {
    let caught: unknown;
    try {
      await requireAdmin(mockCtx(null, null));
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Response);
  });
});
