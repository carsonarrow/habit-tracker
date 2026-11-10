/** A Day as an ISO date string (YYYY-MM-DD). */
export type Day = string;

/** The Day containing `instant` in `timeZone`. */
export function dayOf(instant: Date, timeZone: string): Day {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** Whether `day` is a real calendar date in YYYY-MM-DD form. */
export function isValidDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  return new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day;
}

/** The Day `delta` days after `day` (negative for earlier). */
export function addDays(day: Day, delta: number): Day {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
