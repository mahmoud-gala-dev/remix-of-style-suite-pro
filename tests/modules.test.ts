import { describe, it, expect } from "vitest";
import { MODULES, MODULE_GROUPS } from "../src/lib/modules";

describe("modules registry", () => {
  it("has unique module ids", () => {
    const ids = MODULES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique routes", () => {
    const tos = MODULES.map((m) => m.to);
    expect(new Set(tos).size).toBe(tos.length);
  });

  it("uses absolute routes only", () => {
    for (const m of MODULES) {
      expect(m.to.startsWith("/")).toBe(true);
      expect(m.to.endsWith("/") && m.to !== "/").toBe(false);
    }
  });

  it("every module group is declared in MODULE_GROUPS", () => {
    for (const m of MODULES) {
      expect(MODULE_GROUPS).toContain(m.group);
    }
  });

  it("declares dashboard at root", () => {
    const dash = MODULES.find((m) => m.id === "dashboard");
    expect(dash?.to).toBe("/");
  });
});
