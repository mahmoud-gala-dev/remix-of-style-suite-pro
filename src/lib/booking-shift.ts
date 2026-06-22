/** Shift row shape returned from `employee_shifts`. */
export type ShiftRow = { weekday: number; start_time: string; end_time: string };

/** "HH:MM" or "HH:MM:SS" → minutes since midnight. */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** True if [startAt, endAt] falls fully inside at least one shift for that weekday.
 *  When `shifts` is empty, returns true (no shift constraint configured).
 *  Times are compared in UTC to match server-fn behavior.
 */
export function isWithinShift(startAt: Date, endAt: Date, shifts: ShiftRow[]): boolean {
  if (shifts.length === 0) return true;
  const weekday = startAt.getUTCDay();
  const startMin = startAt.getUTCHours() * 60 + startAt.getUTCMinutes();
  const endMin = endAt.getUTCHours() * 60 + endAt.getUTCMinutes();
  return shifts.some(
    (s) => s.weekday === weekday && timeToMinutes(s.start_time) <= startMin && timeToMinutes(s.end_time) >= endMin,
  );
}

/** Half-open overlap: existing.start < newEnd AND existing.end > newStart. */
export function bookingsOverlap(
  a: { start: Date; end: Date },
  b: { start: Date; end: Date },
): boolean {
  return a.start < b.end && a.end > b.start;
}