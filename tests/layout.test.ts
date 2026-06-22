import { beforeEach, describe, expect, it } from "vitest";
import { ADMIN_ONLY_MODULES, DEFAULT_LAYOUT, snapshotLayout, useLayout, type LayoutSnapshot } from "@/lib/layout";

describe("layout defaults", () => {
  it("starts in sidebar mode with footer disabled", () => {
    expect(DEFAULT_LAYOUT.mode).toBe("sidebar");
    expect(DEFAULT_LAYOUT.footerEnabled).toBe(false);
  });

  it("keeps admin-only modules out of normal operations", () => {
    expect(ADMIN_ONLY_MODULES.has("settings")).toBe(true);
    expect(ADMIN_ONLY_MODULES.has("reports")).toBe(true);
    expect(ADMIN_ONLY_MODULES.has("bookings")).toBe(false);
  });

  it("gives admins a settings footer shortcut but not regular users", () => {
    expect(DEFAULT_LAYOUT.footerItems.admin).toContain("settings");
    expect(DEFAULT_LAYOUT.footerItems.user).not.toContain("settings");
  });
});

describe("snapshotLayout", () => {
  it("returns an equivalent layout snapshot", () => {
    const source: LayoutSnapshot = {
      mode: "topbar",
      hiddenItems: { admin: ["reports"], user: ["queue"] },
      footerEnabled: true,
      footerItems: { admin: ["dashboard"], user: ["bookings"] },
    };

    expect(snapshotLayout(source)).toEqual(source);
  });

  it("deep-copies role arrays", () => {
    const source: LayoutSnapshot = {
      mode: "sidebar",
      hiddenItems: { admin: ["reports"], user: [] },
      footerEnabled: false,
      footerItems: { admin: ["dashboard"], user: ["customers"] },
    };

    const snap = snapshotLayout(source);
    snap.hiddenItems.admin.push("settings");
    snap.footerItems.user.push("bookings");

    expect(source.hiddenItems.admin).toEqual(["reports"]);
    expect(source.footerItems.user).toEqual(["customers"]);
  });
});

describe("useLayout store", () => {
  beforeEach(() => {
    useLayout.getState().reset();
  });

  it("sets shell mode", () => {
    useLayout.getState().setMode("topbar");

    expect(useLayout.getState().mode).toBe("topbar");
  });

  it("toggles hidden modules per role", () => {
    useLayout.getState().toggleHidden("user", "queue");
    expect(useLayout.getState().hiddenItems.user).toEqual(["queue"]);
    expect(useLayout.getState().hiddenItems.admin).toEqual([]);

    useLayout.getState().toggleHidden("user", "queue");
    expect(useLayout.getState().hiddenItems.user).toEqual([]);
  });

  it("toggles footer modules per role", () => {
    useLayout.getState().toggleFooterItem("user", "queue");
    expect(useLayout.getState().footerItems.user).toContain("queue");

    useLayout.getState().toggleFooterItem("user", "queue");
    expect(useLayout.getState().footerItems.user).not.toContain("queue");
  });

  it("applies valid profile layout values while preserving unspecified values", () => {
    useLayout.getState().applyProfileLayout({
      mode: "topbar",
      hiddenItems: { user: ["waitlist"] },
      footerEnabled: true,
    });

    const state = useLayout.getState();
    expect(state.mode).toBe("topbar");
    expect(state.hiddenItems.user).toEqual(["waitlist"]);
    expect(state.hiddenItems.admin).toEqual([]);
    expect(state.footerEnabled).toBe(true);
    expect(state.footerItems).toEqual(DEFAULT_LAYOUT.footerItems);
  });

  it("ignores invalid persisted mode and malformed role arrays", () => {
    useLayout.getState().applyProfileLayout({
      mode: "floating",
      hiddenItems: { admin: "settings" },
      footerItems: { user: null },
    } as unknown as Partial<LayoutSnapshot>);

    const state = useLayout.getState();
    expect(state.mode).toBe("sidebar");
    expect(state.hiddenItems).toEqual(DEFAULT_LAYOUT.hiddenItems);
    expect(state.footerItems).toEqual(DEFAULT_LAYOUT.footerItems);
  });
});