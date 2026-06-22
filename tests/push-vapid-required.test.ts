import { describe, it, expect, afterEach } from "vitest";

// Regression test for KI-002: VAPID_PRIVATE_KEY MUST be required in
// every environment — no hardcoded dev fallback in the source.
import { readFileSync } from "node:fs";

const original = process.env.VAPID_PRIVATE_KEY;
afterEach(() => {
  if (original === undefined) delete process.env.VAPID_PRIVATE_KEY;
  else process.env.VAPID_PRIVATE_KEY = original;
});

describe("VAPID hardcoded fallback (KI-002)", () => {
  it("source no longer contains a DEV_VAPID_PRIVATE_KEY constant", () => {
    const src = readFileSync("src/lib/push.server.ts", "utf8");
    expect(src).not.toMatch(/DEV_VAPID_PRIVATE_KEY/);
    expect(src).not.toMatch(/k04qZxb_P2lK7B_14twzpN7TGtu_kJFs2b17P84-SHs/);
  });

  it("sendWebPush throws clearly when VAPID_PRIVATE_KEY is unset", async () => {
    delete process.env.VAPID_PRIVATE_KEY;
    // Bypass static type-check on the dynamic import path so this file
    // doesn't pull push.server into the client bundle graph.
    const dyn = (path: string) => import(/* @vite-ignore */ path);
    const { sendWebPush } = (await dyn("../src/lib/push.server")) as typeof import("../src/lib/push.server");
    await expect(
      sendWebPush(
        { endpoint: "https://fcm.googleapis.com/x", p256dh: "BNNL", auth: "AAAA" },
        { title: "x" },
      ),
    ).rejects.toThrow(/VAPID_PRIVATE_KEY is not configured/);
  });
});
