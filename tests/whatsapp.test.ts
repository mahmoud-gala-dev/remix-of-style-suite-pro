import { describe, it, expect } from "vitest";
import { waLink, buildBookingConfirmMsg, buildReminderMsg, buildWaitlistOpenSlotMsg } from "@/lib/whatsapp";

describe("waLink", () => {
  it("strips non-digits and encodes message", () => {
    const url = waLink("+1 (555) 123-4567", "hi there!");
    expect(url).toBe("https://wa.me/15551234567?text=hi%20there!");
  });
  it("handles empty phone", () => {
    expect(waLink("", "x")).toBe("https://wa.me/?text=x");
  });
});

const baseOpts = {
  customerName: "Sara",
  serviceName: "Haircut",
  branchName: "Downtown",
  startAt: "2026-07-01T10:00:00.000Z",
  manageUrl: "https://x.test/my/abc",
};

describe("booking messages", () => {
  it("English confirm contains key fields", () => {
    const m = buildBookingConfirmMsg({ ...baseOpts, lang: "en" });
    expect(m).toContain("Sara");
    expect(m).toContain("Downtown");
    expect(m).toContain("Haircut");
    expect(m).toContain("https://x.test/my/abc");
  });
  it("Arabic confirm switches greeting", () => {
    const m = buildBookingConfirmMsg({ ...baseOpts, lang: "ar" });
    expect(m.startsWith("مرحباً")).toBe(true);
  });
  it("Reminder includes manage url", () => {
    expect(buildReminderMsg(baseOpts)).toContain(baseOpts.manageUrl);
  });
  it("Waitlist message includes booking url", () => {
    const m = buildWaitlistOpenSlotMsg({
      customerName: "Lina", branchName: "Mall", serviceName: "Color",
      bookingUrl: "https://x.test/book",
    });
    expect(m).toContain("Lina");
    expect(m).toContain("https://x.test/book");
  });
});