import { describe, it, expect } from "vitest";
import { isWithinShift, bookingsOverlap, timeToMinutes, type ShiftRow } from "@/lib/booking-shift";

// Monday 2026-06-22 (UTC weekday 1)
const mondayAt = (h: number, m = 0) => new Date(Date.UTC(2026, 5, 22, h, m));

describe("timeToMinutes", () => {
  it("parses HH:MM", () => expect(timeToMinutes("09:30")).toBe(570));
  it("parses HH:MM:SS", () => expect(timeToMinutes("17:00:00")).toBe(1020));
});

describe("isWithinShift", () => {
  const monShift: ShiftRow = { weekday: 1, start_time: "09:00", end_time: "17:00" };

  it("returns true when no shifts configured", () => {
    expect(isWithinShift(mondayAt(10), mondayAt(11), [])).toBe(true);
  });

  it("accepts a booking fully inside the shift", () => {
    expect(isWithinShift(mondayAt(10), mondayAt(11), [monShift])).toBe(true);
  });

  it("accepts a booking that exactly fills the shift", () => {
    expect(isWithinShift(mondayAt(9), mondayAt(17), [monShift])).toBe(true);
  });

  it("rejects a booking that starts before the shift", () => {
    expect(isWithinShift(mondayAt(8, 30), mondayAt(10), [monShift])).toBe(false);
  });

  it("rejects a booking that ends after the shift", () => {
    expect(isWithinShift(mondayAt(16), mondayAt(17, 30), [monShift])).toBe(false);
  });

  it("rejects when shift is for a different weekday", () => {
    const tuesdayShift: ShiftRow = { weekday: 2, start_time: "09:00", end_time: "17:00" };
    expect(isWithinShift(mondayAt(10), mondayAt(11), [tuesdayShift])).toBe(false);
  });

  it("accepts when any shift covers the booking", () => {
    const morning: ShiftRow = { weekday: 1, start_time: "09:00", end_time: "12:00" };
    const evening: ShiftRow = { weekday: 1, start_time: "16:00", end_time: "20:00" };
    expect(isWithinShift(mondayAt(17), mondayAt(18), [morning, evening])).toBe(true);
    expect(isWithinShift(mondayAt(13), mondayAt(14), [morning, evening])).toBe(false);
  });
});

describe("bookingsOverlap", () => {
  const a = { start: mondayAt(10), end: mondayAt(11) };
  it("detects overlap when b starts inside a", () => {
    expect(bookingsOverlap(a, { start: mondayAt(10, 30), end: mondayAt(11, 30) })).toBe(true);
  });
  it("detects overlap when b contains a", () => {
    expect(bookingsOverlap(a, { start: mondayAt(9), end: mondayAt(12) })).toBe(true);
  });
  it("no overlap when b ends exactly at a.start (half-open)", () => {
    expect(bookingsOverlap(a, { start: mondayAt(9), end: mondayAt(10) })).toBe(false);
  });
  it("no overlap when b starts exactly at a.end (half-open)", () => {
    expect(bookingsOverlap(a, { start: mondayAt(11), end: mondayAt(12) })).toBe(false);
  });
});