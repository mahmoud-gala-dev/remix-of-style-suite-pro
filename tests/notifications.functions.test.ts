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

let storedValue: unknown = null;
let lastUpsert: unknown = null;

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: storedValue ? { value: storedValue } : null, error: null }),
        }),
      }),
      upsert: async (row: unknown) => {
        lastUpsert = row;
        return { error: null };
      },
    }),
  },
}));

import {
  getNotificationSettings,
  updateNotificationSettings,
  sendNotification,
} from "../src/lib/notifications.functions";

type FnLike = { _validator?: (d: unknown) => unknown; _handler: (a: unknown) => unknown };
const getFn = getNotificationSettings as unknown as FnLike;
const updateFn = updateNotificationSettings as unknown as FnLike;
const sendFn = sendNotification as unknown as FnLike;

function ctxRole(admin: boolean) {
  return {
    userId: "u-1",
    supabase: {
      rpc: (_fn: string, args: { _role: string }) =>
        Promise.resolve({ data: args._role === "admin" ? admin : false }),
    },
  };
}

beforeEach(() => {
  storedValue = null;
  lastUpsert = null;
});

describe("notifications server functions", () => {
  it("getNotificationSettings returns defaults when nothing stored", async () => {
    const res = (await getFn._handler({})) as Record<string, unknown>;
    expect(res).toEqual({ provider: "off", from_email: "", notify_booking_created: false });
  });

  it("getNotificationSettings overlays stored partial value", async () => {
    storedValue = { provider: "resend", from_email: "a@b.co" };
    const res = (await getFn._handler({})) as Record<string, unknown>;
    expect(res).toMatchObject({ provider: "resend", from_email: "a@b.co", notify_booking_created: false });
  });

  it("updateNotificationSettings validator rejects invalid provider", () => {
    expect(() =>
      updateFn._validator!({ provider: "smtp", from_email: "", notify_booking_created: false }),
    ).toThrow();
  });

  it("updateNotificationSettings 403s non-admins and does not write", async () => {
    let caught: unknown;
    try {
      await updateFn._handler({
        data: { provider: "off", from_email: "", notify_booking_created: false },
        context: ctxRole(false),
      });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Response);
    expect((caught as Response).status).toBe(403);
    expect(lastUpsert).toBeNull();
  });

  it("updateNotificationSettings persists for admins", async () => {
    const out = await updateFn._handler({
      data: { provider: "resend", from_email: "a@b.co", notify_booking_created: true },
      context: ctxRole(true),
    });
    expect(out).toEqual({ ok: true });
    expect(lastUpsert).toMatchObject({
      key: "notification_settings",
      value: { provider: "resend", from_email: "a@b.co", notify_booking_created: true },
    });
  });

  it("sendNotification short-circuits when provider is off", async () => {
    storedValue = { provider: "off" };
    const res = await sendFn._handler({
      data: { to: "x@y.co", subject: "s", html: "<b>h</b>" },
      context: ctxRole(true),
    });
    expect(res).toEqual({ skipped: true, reason: "provider_off" });
  });
});