import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verifyHmacSignature } from "@/lib/stripe-verify";

const secret = "whsec_test_123";
const payload = JSON.stringify({ type: "checkout.session.completed", data: { object: { id: "cs_1" } } });
const goodSig = createHmac("sha256", secret).update(payload).digest("hex");

describe("verifyHmacSignature", () => {
  it("accepts a matching signature", () => {
    expect(() => verifyHmacSignature(payload, goodSig, secret)).not.toThrow();
  });

  it("rejects a tampered payload with 401", () => {
    try {
      verifyHmacSignature(payload + "x", goodSig, secret);
      throw new Error("expected to throw");
    } catch (e) {
      expect(e).toBeInstanceOf(Response);
      expect((e as Response).status).toBe(401);
    }
  });

  it("rejects a wrong-length signature without comparing bytes", () => {
    expect(() => verifyHmacSignature(payload, "deadbeef", secret)).toThrow(Response);
  });

  it("rejects a same-length but different signature", () => {
    const bad = goodSig.replace(/.$/, (c) => (c === "0" ? "1" : "0"));
    expect(() => verifyHmacSignature(payload, bad, secret)).toThrow(Response);
  });

  it("rejects when secret differs", () => {
    expect(() => verifyHmacSignature(payload, goodSig, "other")).toThrow(Response);
  });
});