import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { openDb } from "./db";
import { createCore } from "./core";

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

function makeCore(opts: { now?: Date; timeZone?: string } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "habits-"));
  dirs.push(dir);
  const db = openDb(path.join(dir, "test.db"));
  let now = opts.now ?? new Date("2026-03-10T12:00:00Z");
  const core = createCore({ db, now: () => now, timeZone: opts.timeZone ?? "UTC" });
  return { core, setNow: (d: Date) => (now = d) };
}

describe("Habits", () => {
  it("an added Habit appears on today's list", () => {
    const { core } = makeCore();
    core.addHabit("Read");
    expect(core.habitsForToday().map((h) => h.name)).toEqual(["Read"]);
  });

  it("lists Habits in creation order", () => {
    const { core } = makeCore();
    core.addHabit("Read");
    core.addHabit("Walk");
    core.addHabit("Meditate");
    expect(core.habitsForToday().map((h) => h.name)).toEqual(["Read", "Walk", "Meditate"]);
  });

  it("defaults a Habit's Start Day to today in the configured time zone", () => {
    const { core } = makeCore({
      now: new Date("2026-03-10T02:00:00Z"),
      timeZone: "America/New_York",
    });
    expect(core.addHabit("Read").startDay).toBe("2026-03-09");
    expect(core.today()).toBe("2026-03-09");
  });

  it("trims the name and rejects a blank one", () => {
    const { core } = makeCore();
    expect(core.addHabit("  Read  ").name).toBe("Read");
    expect(() => core.addHabit("   ")).toThrow(/name/i);
    expect(core.habitsForToday()).toHaveLength(1);
  });
});

describe("Renaming a Habit", () => {
  it("renames the Habit and keeps its Check-ins", () => {
    const { core } = makeCore();
    const habit = core.addHabit("Read");
    core.toggleCheckIn(habit.id);
    expect(core.renameHabit(habit.id, "  Read books ").name).toBe("Read books");
    expect(core.habitsForToday()).toMatchObject([{ name: "Read books", checkedIn: true }]);
  });

  it("rejects a blank name and leaves the Habit unchanged", () => {
    const { core } = makeCore();
    const habit = core.addHabit("Read");
    expect(() => core.renameHabit(habit.id, "   ")).toThrow(/name/i);
    expect(core.getHabit(habit.id)?.name).toBe("Read");
  });

  it("throws for an unknown Habit", () => {
    const { core } = makeCore();
    expect(() => core.renameHabit(999, "Read")).toThrow(/not found/i);
  });
});

describe("Check-ins", () => {
  it("toggling a Habit ticks it off today", () => {
    const { core } = makeCore();
    const habit = core.addHabit("Read");
    expect(core.toggleCheckIn(habit.id)).toBe(true);
    expect(core.habitsForToday()).toMatchObject([{ name: "Read", checkedIn: true }]);
  });

  it("toggling again unticks it", () => {
    const { core } = makeCore();
    const habit = core.addHabit("Read");
    core.toggleCheckIn(habit.id);
    expect(core.toggleCheckIn(habit.id)).toBe(false);
    expect(core.habitsForToday()).toMatchObject([{ checkedIn: false }]);
  });

  it("alternates on repeated toggles, never doubling a Check-in", () => {
    const { core } = makeCore();
    const read = core.addHabit("Read");
    core.addHabit("Walk");
    expect([1, 2, 3].map(() => core.toggleCheckIn(read.id))).toEqual([true, false, true]);
    expect(core.habitsForToday().map((h) => [h.name, h.checkedIn])).toEqual([
      ["Read", true],
      ["Walk", false],
    ]);
  });

  it("a Check-in belongs to today only", () => {
    const { core, setNow } = makeCore({ now: new Date("2026-03-10T23:00:00Z") });
    const habit = core.addHabit("Read");
    core.toggleCheckIn(habit.id);
    setNow(new Date("2026-03-11T01:00:00Z"));
    expect(core.habitsForToday()).toMatchObject([{ checkedIn: false }]);
    expect(core.toggleCheckIn(habit.id)).toBe(true);
  });

  it("persists across reopening the database", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "habits-"));
    dirs.push(dir);
    const file = path.join(dir, "test.db");
    const now = () => new Date("2026-03-10T12:00:00Z");
    const first = createCore({ db: openDb(file), now, timeZone: "UTC" });
    first.toggleCheckIn(first.addHabit("Read").id);
    const second = createCore({ db: openDb(file), now, timeZone: "UTC" });
    expect(second.habitsForToday()).toMatchObject([{ name: "Read", checkedIn: true }]);
  });

  it("rejects a Check-in for an unknown Habit", () => {
    const { core } = makeCore();
    expect(() => core.toggleCheckIn(999)).toThrow();
  });
});

describe("Moving between Days", () => {
  it("toggles a Check-in on a past Day without touching today", () => {
    const { core } = makeCore();
    const habit = core.addHabit("Read");
    core.setStartDay(habit.id, "2026-03-08");
    expect(core.toggleCheckIn(habit.id, "2026-03-08")).toBe(true);
    expect(core.habitsOn("2026-03-08")).toMatchObject([{ checkedIn: true }]);
    expect(core.habitsOn("2026-03-09")).toMatchObject([{ checkedIn: false }]);
    expect(core.habitsForToday()).toMatchObject([{ checkedIn: false }]);
    expect(core.toggleCheckIn(habit.id, "2026-03-08")).toBe(false);
  });

  it("rejects listing and toggling Days after today", () => {
    const { core } = makeCore();
    const habit = core.addHabit("Read");
    expect(() => core.habitsOn("2026-03-11")).toThrow(/future/i);
    expect(() => core.toggleCheckIn(habit.id, "2026-03-11")).toThrow(/future/i);
    expect(core.habitsOn("2026-03-10")).toHaveLength(1);
  });

  it("rejects a malformed Day", () => {
    const { core } = makeCore();
    expect(() => core.habitsOn("yesterday")).toThrow(/day/i);
    expect(() => core.habitsOn("2026-02-30")).toThrow(/day/i);
  });

  it("derives today across midnight in a non-UTC time zone", () => {
    const { core, setNow } = makeCore({
      now: new Date("2026-03-10T03:59:00Z"), // 23:59 in New York (EDT, UTC-4)
      timeZone: "America/New_York",
    });
    const habit = core.addHabit("Read");
    expect(core.today()).toBe("2026-03-09");
    expect(() => core.toggleCheckIn(habit.id, "2026-03-10")).toThrow(/future/i);
    setNow(new Date("2026-03-10T04:00:00Z")); // midnight in New York
    expect(core.today()).toBe("2026-03-10");
    expect(core.toggleCheckIn(habit.id, "2026-03-10")).toBe(true);
    expect(core.habitsOn("2026-03-09")).toMatchObject([{ checkedIn: false }]);
  });
});

describe("Start Day", () => {
  it("can be backdated, making the Habit appear and toggleable on earlier Days", () => {
    const { core } = makeCore();
    const habit = core.addHabit("Read");
    expect(core.habitsOn("2026-03-08")).toEqual([]);
    expect(core.setStartDay(habit.id, "2026-03-08").startDay).toBe("2026-03-08");
    expect(core.habitsOn("2026-03-08")).toMatchObject([{ name: "Read", checkedIn: false }]);
    expect(core.toggleCheckIn(habit.id, "2026-03-08")).toBe(true);
  });

  it("hides the Habit on Days before it and rejects toggling there", () => {
    const { core } = makeCore();
    const habit = core.addHabit("Read");
    expect(core.habitsOn("2026-03-09")).toEqual([]);
    expect(() => core.toggleCheckIn(habit.id, "2026-03-09")).toThrow(/start day/i);
    expect(core.habitsOn("2026-03-10")).toHaveLength(1);
  });

  it("rejects a future or malformed Start Day", () => {
    const { core } = makeCore();
    const habit = core.addHabit("Read");
    expect(() => core.setStartDay(habit.id, "2026-03-11")).toThrow(/future/i);
    expect(() => core.setStartDay(habit.id, "nope")).toThrow(/day/i);
    expect(core.getHabit(habit.id)?.startDay).toBe("2026-03-10");
  });

  it("rejects moving it past an existing Check-in, leaving it unchanged", () => {
    const { core } = makeCore();
    const habit = core.addHabit("Read");
    core.setStartDay(habit.id, "2026-03-05");
    core.toggleCheckIn(habit.id, "2026-03-06");
    expect(() => core.setStartDay(habit.id, "2026-03-07")).toThrow(/check-in.*2026-03-06/i);
    expect(core.getHabit(habit.id)?.startDay).toBe("2026-03-05");
    expect(core.setStartDay(habit.id, "2026-03-06").startDay).toBe("2026-03-06");
  });

  it("throws for an unknown Habit", () => {
    const { core } = makeCore();
    expect(() => core.setStartDay(999, "2026-03-10")).toThrow(/not found/i);
  });
});

describe("Archiving a Habit", () => {
  it("hides the Habit from today and later Days", () => {
    const { core, setNow } = makeCore();
    const habit = core.addHabit("Read");
    core.archiveHabit(habit.id);
    expect(core.habitsForToday()).toEqual([]);
    setNow(new Date("2026-03-12T12:00:00Z"));
    expect(core.habitsOn("2026-03-12")).toEqual([]);
  });

  it("shows read-only with its Check-in state on earlier Days", () => {
    const { core, setNow } = makeCore();
    const habit = core.addHabit("Read");
    core.toggleCheckIn(habit.id);
    setNow(new Date("2026-03-12T12:00:00Z"));
    core.archiveHabit(habit.id);
    expect(core.habitsOn("2026-03-10")).toMatchObject([
      { name: "Read", checkedIn: true, readOnly: true },
    ]);
    expect(core.habitsOn("2026-03-11")).toMatchObject([{ checkedIn: false, readOnly: true }]);
  });

  it("is hidden on the archive Day itself but visible the Day before", () => {
    const { core } = makeCore();
    const habit = core.addHabit("Read");
    core.archiveHabit(habit.id);
    expect(core.habitsOn("2026-03-10")).toEqual([]);
    const other = makeCore({ now: new Date("2026-03-09T12:00:00Z") });
    const h2 = other.core.addHabit("Walk");
    other.setNow(new Date("2026-03-10T12:00:00Z"));
    other.core.archiveHabit(h2.id);
    expect(other.core.habitsOn("2026-03-09")).toMatchObject([{ readOnly: true }]);
  });

  it("keeps the original archive Day when archived again", () => {
    const { core, setNow } = makeCore();
    const habit = core.addHabit("Read");
    core.archiveHabit(habit.id);
    setNow(new Date("2026-03-12T12:00:00Z"));
    expect(core.archiveHabit(habit.id).archiveDay).toBe("2026-03-10");
  });

  it("marks active Habits as not read-only", () => {
    const { core } = makeCore();
    core.addHabit("Read");
    expect(core.habitsForToday()[0].readOnly).toBe(false);
  });

  it("rejects toggling an Archived Habit on any Day", () => {
    const { core, setNow } = makeCore();
    const habit = core.addHabit("Read");
    setNow(new Date("2026-03-12T12:00:00Z"));
    core.archiveHabit(habit.id);
    expect(() => core.toggleCheckIn(habit.id, "2026-03-10")).toThrow(/archived/i);
    expect(() => core.toggleCheckIn(habit.id)).toThrow(/archived/i);
  });

  it("lists Archived Habits, and Restore makes them active again with no gap", () => {
    const { core, setNow } = makeCore();
    const habit = core.addHabit("Read");
    core.addHabit("Walk");
    core.toggleCheckIn(habit.id);
    setNow(new Date("2026-03-12T12:00:00Z"));
    core.archiveHabit(habit.id);
    expect(core.archivedHabits().map((h) => h.name)).toEqual(["Read"]);

    core.restoreHabit(habit.id);
    expect(core.archivedHabits()).toEqual([]);
    // Active on every Day since its Start Day, including the archived gap.
    expect(core.habitsOn("2026-03-11")).toMatchObject([
      { name: "Read", readOnly: false },
      { name: "Walk" },
    ]);
    expect(core.habitsOn("2026-03-10")[0]).toMatchObject({ checkedIn: true });
    expect(core.toggleCheckIn(habit.id)).toBe(true);
  });

  it("throws for an unknown Habit", () => {
    const { core } = makeCore();
    expect(() => core.archiveHabit(99)).toThrow(/not found/);
    expect(() => core.restoreHabit(99)).toThrow(/not found/);
  });
});
