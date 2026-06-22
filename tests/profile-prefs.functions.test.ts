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

import { getProfileLayoutPrefs, saveProfileLayoutPrefs } from "../src/lib/profile-prefs.functions";

type FnLike = { _validator?: (d: unknown) => unknown; _handler: (a: unknown) => unknown };
const getFn = getProfileLayoutPrefs as unknown as FnLike;
const saveFn = saveProfileLayoutPrefs as unknown as FnLike;

function makeCtx(preferences: unknown, opts: { readError?: boolean; writeError?: boolean } = {}) {
  const upserts: unknown[] = [];
  const supabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () =>
            opts.readError
              ? { data: null, error: { message: "read fail" } }
              : { data: { preferences }, error: null },
        }),
      }),
      upsert: async (row: unknown) => {
        upserts.push(row);
        return opts.writeError ? { error: { message: "write fail" } } : { error: null };
      },
    }),
  };
  return { ctx: { supabase, userId: "u-1" }, upserts };
}

const validLayout = {
  mode: "sidebar" as const,
  hiddenItems: { admin: ["x"], user: [] },
  footerEnabled: true,
  footerItems: { admin: [], user: ["y"] },
};

describe("profile-prefs server functions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getProfileLayoutPrefs returns parsed layout when preferences are valid", async () => {
    const { ctx } = makeCtx({ layout: validLayout });
    const result = await getFn._handler({ context: ctx });
    expect(result).toEqual({ layout: validLayout });
  });

  it("getProfileLayoutPrefs returns null layout when preferences are missing/invalid", async () => {
    const { ctx } = makeCtx({ layout: { mode: "weird" } });
    expect(await getFn._handler({ context: ctx })).toEqual({ layout: null });

    const { ctx: ctx2 } = makeCtx(null);
    expect(await getFn._handler({ context: ctx2 })).toEqual({ layout: null });
  });

  it("getProfileLayoutPrefs throws on read error", async () => {
    const { ctx } = makeCtx(null, { readError: true });
    await expect(getFn._handler({ context: ctx })).rejects.toThrow("read fail");
  });

  it("saveProfileLayoutPrefs validates and rejects bad input", () => {
    expect(() => saveFn._validator!({ mode: "bogus" })).toThrow();
  });

  it("saveProfileLayoutPrefs merges new layout into existing preferences", async () => {
    const { ctx, upserts } = makeCtx({ other: 1, layout: { stale: true } });
    const out = await saveFn._handler({ data: validLayout, context: ctx });
    expect(out).toEqual({ ok: true });
    expect(upserts).toHaveLength(1);
    const row = upserts[0] as { id: string; preferences: { other: number; layout: unknown } };
    expect(row.id).toBe("u-1");
    expect(row.preferences.other).toBe(1);
    expect(row.preferences.layout).toEqual(validLayout);
  });

  it("saveProfileLayoutPrefs throws on write error", async () => {
    const { ctx } = makeCtx({}, { writeError: true });
    await expect(saveFn._handler({ data: validLayout, context: ctx })).rejects.toThrow("write fail");
  });
});