import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("drops falsy values", () => {
    expect(cn("a", false && "b", null, undefined, "", "c")).toBe("a c");
  });

  it("supports conditional object syntax", () => {
    expect(cn("base", { active: true, disabled: false })).toBe("base active");
  });

  it("flattens nested arrays", () => {
    expect(cn(["a", ["b", ["c"]]])).toBe("a b c");
  });

  it("merges conflicting Tailwind utilities (later wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("merges conflicting responsive variants per breakpoint", () => {
    expect(cn("md:p-2", "md:p-4")).toBe("md:p-4");
  });

  it("preserves non-conflicting utilities from both inputs", () => {
    const out = cn("p-2 text-sm", "p-4 font-bold");
    expect(out).toContain("text-sm");
    expect(out).toContain("font-bold");
    expect(out).toContain("p-4");
    expect(out).not.toContain("p-2");
  });
});