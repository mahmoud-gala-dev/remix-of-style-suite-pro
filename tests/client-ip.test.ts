import { describe, it, expect } from "vitest";
import { getClientIp } from "@/lib/rate-limit";

const make = (h: Record<string, string>) => new Request("https://x.local/", { headers: h });

describe("getClientIp", () => {
  it("prefers cf-connecting-ip when present", () => {
    expect(getClientIp(make({
      "cf-connecting-ip": "1.2.3.4",
      "x-forwarded-for": "9.9.9.9, 8.8.8.8",
    }))).toBe("1.2.3.4");
  });

  it("falls back to first x-forwarded-for entry", () => {
    expect(getClientIp(make({ "x-forwarded-for": "9.9.9.9, 8.8.8.8" }))).toBe("9.9.9.9");
  });

  it("trims whitespace around the first x-forwarded-for entry", () => {
    expect(getClientIp(make({ "x-forwarded-for": "  5.5.5.5  ,1.1.1.1" }))).toBe("5.5.5.5");
  });

  it("returns 'unknown' when no headers are present", () => {
    expect(getClientIp(make({}))).toBe("unknown");
  });
});