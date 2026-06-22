import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase admin so the local fallback path is exercised deterministically.
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: vi.fn().mockResolvedValue({ error: { message: "boom" } }),
  },
}));

import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit (local fallback)", () => {
  beforeEach(() => vi.useRealTimers());

  it("allows requests under capacity", async () => {
    const key = `t:${Math.random()}`;
    await expect(rateLimit(key, { capacity: 3, refillPerMin: 1 })).resolves.toBeUndefined();
    await expect(rateLimit(key, { capacity: 3, refillPerMin: 1 })).resolves.toBeUndefined();
    await expect(rateLimit(key, { capacity: 3, refillPerMin: 1 })).resolves.toBeUndefined();
  });

  it("throws 429 Response when bucket is empty", async () => {
    const key = `t:${Math.random()}`;
    await rateLimit(key, { capacity: 1, refillPerMin: 1 });
    await expect(rateLimit(key, { capacity: 1, refillPerMin: 1 })).rejects.toMatchObject({
      status: 429,
    });
  });
});