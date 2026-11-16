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

/** The days of the week, in display order. */
export const weekdays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof weekdays)[number];

/** The day of the week `day` falls on. */
export function weekdayOf(day: Day): Weekday {
  // getUTCDay: 0 = Sunday.
  return weekdays[(new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7];
}

/** A readable label for `day`, e.g. "Mon, 16 Nov"; the year is added when it isn't today's year. */
export function formatDay(day: Day, today: Day): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "UTC",
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    })
      .formatToParts(new Date(`${day}T00:00:00Z`))
      .map((p) => [p.type, p.value]),
  );
  const label = `${parts.weekday}, ${parts.day} ${parts.month}`;
  return day.slice(0, 4) === today.slice(0, 4) ? label : `${label} ${parts.year}`;
}

/** `day` as a local Date at noon (safe across DST gaps), for date pickers. */
export function toLocalDate(day: Day): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

/** The Day of a local Date picked in a date picker. */
export function fromLocalDate(date: Date): Day {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}
