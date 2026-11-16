import type { HabitOnDay } from "@/core/core";

export type WhenItComesUpSummary = {
  /** How many Opportunistic Habits are on the Day. */
  count: number;
  /** How many of them have a Check-in (Done or Not done) that Day. */
  checkedIn: number;
  /** Collapsed by default, open on a Day where any of them has a Check-in. */
  defaultOpen: boolean;
};

/** Summarises a Day's Opportunistic Habits for the "When it comes up" section header. */
export function summarizeWhenItComesUp(habits: readonly HabitOnDay[]): WhenItComesUpSummary {
  const checkedIn = habits.filter((h) => h.state !== "unrecorded").length;
  return { count: habits.length, checkedIn, defaultOpen: checkedIn > 0 };
}
