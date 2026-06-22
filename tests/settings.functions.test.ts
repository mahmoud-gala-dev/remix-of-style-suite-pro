import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@tanstack/react-start", () => {
  const make = () => {
    const b: Record<string, unknown> = {};
    b.middleware = () => b;
    b.inputValidator = (fn: unknown) => {
      b._validator = fn;
      return b;
    };
    b.handler = (fn: unknown) => ({ _validator: b._validator, _handler: fn });
    return b;
  };
  return { createServerFn: () => make() };
});
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));

let adminRows: Array<{ key: string; value: unknown }> = [];
let adminUpserts: unknown[] = [];
let adminError: { message: string } | null = null;

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ in: async () => ({ data: adminRows, error: null }) }),
      upsert: async (row: unknown) => {
        adminUpserts.push(row);
        return { error: adminError };
      },
    }),
  },
}));

import { getAppSettings, setAppSetting } from "../src/lib/settings.functions";

type FnLike = { _validator?: (d: unknown) => unknown; _handler: (a: unknown) => unknown };
const getFn = getAppSettings as unknown as FnLike;
const setFn = setAppSetting as unknown as FnLike;

beforeEach(() => {
  adminRows = [];
  adminUpserts = [];
  adminError = null;
});

function ctxWithRole(admin: boolean, sa = false) {
  return {
    userId: "u-1",
    supabase: {
      rpc: (_fn: string, args: { _role: string }) =>
        Promise.resolve({ data: args._role === "admin" ? admin : sa }),
    },
  };
}

describe("settings.functions", () => {
  it("getAppSettings returns defaults when no rows stored", async () => {
    const res = (await getFn._handler({})) as Record<string, unknown>;
    expect(res.booking_otp_required).toBe(false);
    expect(res.default_tax_pct).toBe(0);
    expect(res.refresh_interval).toBe(30);
    expect(res.deposit_type).toBe("percent");
  });

  it("getAppSettings merges stored values over defaults", async () => {
    adminRows = [
      { key: "booking_otp_required", value: true },
      { key: "default_tax_pct", value: 15 },
      { key: "deposit_type", value: "fixed" },
    ];
    const res = (await getFn._handler({})) as Record<string, unknown>;
    expect(res.booking_otp_required).toBe(true);
    expect(res.default_tax_pct).toBe(15);
    expect(res.deposit_type).toBe("fixed");
  });

  it("setAppSetting validator rejects unknown key", () => {
    expect(() => setFn._validator!({ key: "not_a_key", value: true })).toThrow();
  });

  it("setAppSetting throws 403 Response when caller is not admin/super_admin", async () => {
    let caught: unknown;
    try {
      await setFn._handler({ data: { key: "deposits_enabled", value: true }, context: ctxWithRole(false) });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Response);
    expect((caught as Response).status).toBe(403);
    expect(adminUpserts).toHaveLength(0);
  });

  it("setAppSetting upserts when caller is admin", async () => {
    await setFn._handler({ data: { key: "deposits_enabled", value: true }, context: ctxWithRole(true) });
    expect(adminUpserts).toHaveLength(1);
    expect(adminUpserts[0]).toMatchObject({ key: "deposits_enabled", value: true });
  });

  it("setAppSetting surfaces upsert error", async () => {
    adminError = { message: "db down" };
    await expect(
      setFn._handler({ data: { key: "deposits_enabled", value: true }, context: ctxWithRole(false, true) }),
    ).rejects.toThrow("db down");
  });
});