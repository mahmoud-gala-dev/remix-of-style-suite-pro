/** Pattern → date stepping helper used by `createRecurringSeries`. */
export type RecurrencePattern = "weekly" | "biweekly" | "monthly";

export function addInterval(d: Date, pattern: RecurrencePattern, n: number): Date {
  const out = new Date(d);
  if (pattern === "weekly") out.setDate(out.getDate() + 7 * n);
  else if (pattern === "biweekly") out.setDate(out.getDate() + 14 * n);
  else out.setMonth(out.getMonth() + n);
  return out;
}

/** Expand a recurring booking into N (start,end) instances preserving duration. */
export function expandRecurrence(
  startAt: Date,
  endAt: Date,
  pattern: RecurrencePattern,
  occurrences: number,
): { start: Date; end: Date }[] {
  const duration = endAt.getTime() - startAt.getTime();
  return Array.from({ length: occurrences }, (_, i) => {
    const s = addInterval(startAt, pattern, i);
    return { start: s, end: new Date(s.getTime() + duration) };
  });
}