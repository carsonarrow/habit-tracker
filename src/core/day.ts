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
