import { describe, it, expect } from "vitest";
import { dict, translateError } from "../src/lib/i18n";

describe("i18n dict", () => {
  it("every key has both en and ar strings", () => {
    for (const [key, entry] of Object.entries(dict)) {
      expect(entry.en, `missing en for ${key}`).toBeTypeOf("string");
      expect(entry.ar, `missing ar for ${key}`).toBeTypeOf("string");
      expect(entry.en.length).toBeGreaterThan(0);
      expect(entry.ar.length).toBeGreaterThan(0);
    }
  });

  it("contains core nav keys", () => {
    for (const key of ["dashboard", "bookings", "customers", "settings"] as const) {
      expect(dict[key]).toBeDefined();
    }
  });
});

describe("translateError fallthrough", () => {
  it("returns network_error for null/undefined", () => {
    expect(translateError(null)).toBe("Network error. Check your connection.");
    expect(translateError(undefined)).toBe("Network error. Check your connection.");
  });

  it("passes through unknown error strings unchanged", () => {
    expect(translateError("some_unknown_xyz")).toBe("some_unknown_xyz");
  });

  it("matches case-insensitive substrings", () => {
    expect(translateError("Got RATE_LIMITED from server")).toContain("Too many attempts");
  });
});
