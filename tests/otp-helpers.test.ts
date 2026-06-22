import { describe, it, expect } from "vitest";
import { shouldExposeOtpCode } from "@/lib/otp-helpers";

describe("shouldExposeOtpCode", () => {
  it("never exposes when delivery succeeded", () => {
    expect(shouldExposeOtpCode(true, { NODE_ENV: "development" })).toBe(false);
    expect(shouldExposeOtpCode(true, { NODE_ENV: "production", EXPOSE_OTP_FOR_TESTS: "1" })).toBe(false);
  });

  it("exposes in development when delivery failed", () => {
    expect(shouldExposeOtpCode(false, { NODE_ENV: "development" })).toBe(true);
  });

  it("hides in production even when delivery failed", () => {
    expect(shouldExposeOtpCode(false, { NODE_ENV: "production" })).toBe(false);
  });

  it("exposes in production only with explicit test opt-in", () => {
    expect(shouldExposeOtpCode(false, { NODE_ENV: "production", EXPOSE_OTP_FOR_TESTS: "1" })).toBe(true);
    expect(shouldExposeOtpCode(false, { NODE_ENV: "production", EXPOSE_OTP_FOR_TESTS: "0" })).toBe(false);
  });
});