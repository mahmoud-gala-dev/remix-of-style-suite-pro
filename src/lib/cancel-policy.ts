/** Bookings that are already in a terminal state cannot be cancelled by the customer. */
export const TERMINAL_STATUSES = ["cancelled", "completed", "no_show"] as const;
export type BookingStatus = string;

/** Minimum hours of notice required before `startAt` to allow self-service cancel. */
export const CANCEL_MIN_HOURS = 2;

export type CancelDecision =
  | { ok: true }
  | { ok: false; reason: "terminal" | "too_late"; status: 400 };

export function canCancelBooking(status: BookingStatus, startAt: Date, now: Date = new Date()): CancelDecision {
  if ((TERMINAL_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, reason: "terminal", status: 400 };
  }
  const hoursAhead = (startAt.getTime() - now.getTime()) / 36e5;
  if (hoursAhead < CANCEL_MIN_HOURS) {
    return { ok: false, reason: "too_late", status: 400 };
  }
  return { ok: true };
}