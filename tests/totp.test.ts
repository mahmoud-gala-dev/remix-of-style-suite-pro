import { describe, it, expect } from "vitest";
import { OTP } from "otplib";

/** Smoke test of the TOTP library that powers `enroll2FA` / `verify2FA`.
 *  Guards against accidental upgrades that break secret generation or
 *  verification semantics our handlers rely on.
 */
describe("otplib TOTP roundtrip", () => {
  it("verifies a freshly-generated code", async () => {
    const otp = new OTP({ strategy: "totp" });
    const secret = otp.generateSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/); // base32
    const token = await otp.generate({ secret });
    expect(token).toMatch(/^\d{6}$/);
    const result = await otp.verify({ secret, token });
    expect(result.valid).toBe(true);
  });

  it("rejects a wrong code", async () => {
    const otp = new OTP({ strategy: "totp" });
    const secret = otp.generateSecret();
    const result = await otp.verify({ secret, token: "000000" });
    expect(result.valid).toBe(false);
  });

  it("emits a usable otpauth URI", () => {
    const otp = new OTP({ strategy: "totp" });
    const secret = otp.generateSecret();
    const uri = otp.generateURI({ issuer: "Vanguard", label: "user@x", secret });
    expect(uri.startsWith("otpauth://totp/")).toBe(true);
    expect(uri).toContain("secret=" + secret);
    expect(uri).toContain("issuer=Vanguard");
  });
});