import { describe, it, expect } from "vitest";
import { translateError } from "@/lib/i18n";

describe("translateError", () => {
  it("maps known code to English message", () => {
    expect(translateError("rate_limited", "en")).toBe(
      "Too many attempts. Try again later.",
    );
  });

  it("maps known code to Arabic message", () => {
    expect(translateError("rate_limited", "ar")).toBe(
      "محاولات كثيرة. حاول لاحقًا.",
    );
  });

  it("unwraps Error instances", () => {
    expect(translateError(new Error("invalid_credentials"), "en")).toBe(
      "Invalid email or password.",
    );
  });

  it("matches the verbatim 'Invalid login credentials' string", () => {
    expect(translateError("Invalid login credentials", "en")).toBe(
      "Invalid email or password.",
    );
  });

  it("matches case-insensitive substring", () => {
    expect(translateError("Error: UNAUTHORIZED action", "en")).toBe(
      "You are not authorized to perform this action.",
    );
  });

  it("returns the raw message when no key matches", () => {
    expect(translateError("totally unique message", "en")).toBe(
      "totally unique message",
    );
  });

  it("falls back to network_error for empty/unknown shapes", () => {
    expect(translateError("", "en")).toBe("Network error. Check your connection.");
    expect(translateError(null, "ar")).toBe("خطأ في الشبكة. تحقق من الاتصال.");
    expect(translateError(undefined, "en")).toBe("Network error. Check your connection.");
  });

  it("defaults to English when lang omitted", () => {
    expect(translateError("not_found")).toBe("Item not found.");
  });
});