import { describe, it, expect, vi } from "vitest";
import { logger, redactPII } from "../src/lib/logger";

describe("PII redaction (Cycle #8 / E)", () => {
  it("masks emails", () => {
    const out = redactPII({ msg: "user a.user@example.com signed in" });
    expect(out.msg).toContain("@example.com");
    expect(out.msg).not.toContain("a.user@example.com");
  });

  it("masks phone numbers", () => {
    const out = redactPII({ phone: "+1 415 555 0199" });
    expect(out.phone).toMatch(/\*\*\*/);
    expect(out.phone).not.toContain("4155550199");
  });

  it("redacts sensitive keys outright", () => {
    const out = redactPII({ authorization: "Bearer secret", password: "hunter2", otp: "123456" });
    expect(out.authorization).toBe("[REDACTED]");
    expect(out.password).toBe("[REDACTED]");
    expect(out.otp).toBe("[REDACTED]");
  });

  it("logger.info applies redaction", () => {
    const lines: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((l: string) => { lines.push(l); });
    logger.info("test_event", { email: "x@y.com", apikey: "abc" });
    spy.mockRestore();
    const parsed = JSON.parse(lines[0]!);
    expect(parsed.apikey).toBe("[REDACTED]");
    expect(parsed.email).not.toBe("x@y.com");
  });
});