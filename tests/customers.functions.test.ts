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

import { bulkImportCustomers } from "../src/lib/customers.functions";

type FnLike = { _validator: (d: unknown) => unknown; _handler: (a: unknown) => unknown };
const fn = bulkImportCustomers as unknown as FnLike;

function makeCtx(existing: Array<{ phone: string }>) {
  const inserts: unknown[][] = [];
  const supabase = {
    from: () => ({
      select: () => ({
        eq: async () => ({ data: existing, error: null }),
      }),
      insert: async (rows: unknown[]) => {
        inserts.push(rows);
        return { error: null };
      },
    }),
  };
  return { ctx: { supabase, userId: "u-1" }, inserts };
}

const branchId = "11111111-1111-1111-1111-111111111111";

describe("bulkImportCustomers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects empty rows array via validator", () => {
    expect(() => fn._validator({ branchId, rows: [] })).toThrow();
  });

  it("rejects invalid branch id", () => {
    expect(() => fn._validator({ branchId: "not-uuid", rows: [{ name: "x", phone: "1" }] })).toThrow();
  });

  it("normalises phones and dedupes against existing", async () => {
    const { ctx, inserts } = makeCtx([{ phone: "0501234567" }]);
    const out = await fn._handler({
      data: {
        branchId,
        rows: [
          { name: "Dup", phone: "0501234567" }, // matches existing after normalise
          { name: "New", phone: "0599999999" },
          { name: "Dup2", phone: "059-9999-999" }, // dup of "New"
        ],
      },
      context: ctx,
    });
    expect(out).toEqual({ added: 1, skipped: 2, total: 3 });
    expect(inserts).toHaveLength(1);
    expect((inserts[0] as Array<{ name: string }>).map((r) => r.name)).toEqual(["New"]);
  });

  it("nullifies empty email/notes", async () => {
    const { ctx, inserts } = makeCtx([]);
    await fn._handler({
      data: { branchId, rows: [{ name: "A", phone: "111", email: "", notes: "" }] },
      context: ctx,
    });
    expect((inserts[0] as Array<{ email: unknown; notes: unknown }>)[0]).toMatchObject({
      email: null,
      notes: null,
    });
  });

  it("returns zero added when all rows are skipped", async () => {
    const { ctx, inserts } = makeCtx([{ phone: "111" }]);
    const out = await fn._handler({
      data: { branchId, rows: [{ name: "X", phone: "111" }] },
      context: ctx,
    });
    expect(out).toEqual({ added: 0, skipped: 1, total: 1 });
    expect(inserts).toHaveLength(0);
  });
});