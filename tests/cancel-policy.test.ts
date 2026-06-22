import { describe, it, expect } from "vitest";
import { canCancelBooking, CANCEL_MIN_HOURS } from "@/lib/cancel-policy";

const now = new Date("2026-06-22T10:00:00Z");
const inHours = (h: number) => new Date(now.getTime() + h * 36e5);

describe("canCancelBooking", () => {
  it("allows cancel when status is active and notice is sufficient", () => {
    expect(canCancelBooking("confirmed", inHours(CANCEL_MIN_HOURS + 1), now)).toEqual({ ok: true });
  });

  it("rejects terminal statuses regardless of time", () => {
    for (const s of ["cancelled", "completed", "no_show"]) {
      expect(canCancelBooking(s, inHours(48), now)).toEqual({ ok: false, reason: "terminal", status: 400 });
    }
  });

  it("rejects when less than 2 hours of notice", () => {
    expect(canCancelBooking("confirmed", inHours(1), now)).toEqual({ ok: false, reason: "too_late", status: 400 });
  });

  it("rejects when booking is in the past", () => {
    expect(canCancelBooking("confirmed", inHours(-1), now)).toEqual({ ok: false, reason: "too_late", status: 400 });
  });

  it("treats exactly the threshold as acceptable", () => {
    expect(canCancelBooking("confirmed", inHours(CANCEL_MIN_HOURS), now)).toEqual({ ok: true });
  });
});