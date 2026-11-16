import { describe, expect, it } from "vitest";
import type { HabitOnDay, HabitState } from "@/core/core";
import { summarizeWhenItComesUp } from "./when-it-comes-up";

function opportunistic(id: number, state: HabitState): HabitOnDay {
  return {
    id,
    name: `Habit ${id}`,
    startDay: "2026-01-01",
    archiveDay: null,
    state,
    readOnly: false,
    opportunistic: true,
  } as HabitOnDay;
}

describe('"When it comes up" summary', () => {
  it("is collapsed when no Opportunistic Habit has a Check-in that Day", () => {
    expect(
      summarizeWhenItComesUp([opportunistic(1, "unrecorded"), opportunistic(2, "unrecorded")]),
    ).toEqual({ count: 2, checkedIn: 0, defaultOpen: false });
  });

  it("counts Done and Not done as Check-ins and opens by default", () => {
    expect(
      summarizeWhenItComesUp([
        opportunistic(1, "done"),
        opportunistic(2, "unrecorded"),
        opportunistic(3, "notDone"),
      ]),
    ).toEqual({ count: 3, checkedIn: 2, defaultOpen: true });
  });
});
