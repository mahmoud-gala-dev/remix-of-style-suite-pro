import { describe, it, expect } from "vitest";
import { renderErrorPage } from "@/lib/error-page";

describe("renderErrorPage", () => {
  const html = renderErrorPage();

  it("returns a complete HTML5 document", () => {
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
    expect(html).toContain('<meta charset="utf-8"');
    expect(html).toContain('name="viewport"');
  });

  it("includes the user-facing copy and recovery actions", () => {
    expect(html).toContain("This page didn't load");
    expect(html).toContain("Try again");
    expect(html).toContain('href="/"');
    expect(html).toContain("location.reload()");
  });

  it("is deterministic", () => {
    expect(renderErrorPage()).toBe(html);
  });
});