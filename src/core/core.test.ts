import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { openDb } from "./db";
import { createCore, type HabitState } from "./core";
import { sql } from "drizzle-orm";

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

function makeCore(opts: { now?: Date; timeZone?: string } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "habits-"));
  dirs.push(dir);
  const db = openDb(path.join(dir, "test.db"));
  let now = opts.now ?? new Date("2026-03-10T12:00:00Z");
  const core = createCore({ db, now: () => now, timeZone: opts.timeZone ?? "UTC" });
  return { core, db, setNow: (d: Date) => (now = d) };
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
  it("renames the Habit and keeps its Check-ins and their outcomes", () => {
    const { core } = makeCore();
    const habit = core.addHabit("Read");
    core.setStartDay(habit.id, "2026-03-09");
    core.setState(habit.id, "notDone", "2026-03-09");
    core.setState(habit.id, "done");
    expect(core.renameHabit(habit.id, "  Read books ").name).toBe("Read books");
    expect(core.habitsOn("2026-03-09")).toMatchObject([{ name: "Read books", state: "notDone" }]);
    expect(core.habitsForToday()).toMatchObject([{ name: "Read books", state: "done" }]);
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
  it("a new Habit is Unrecorded today", () => {
    const { core } = makeCore();
    core.addHabit("Read");
    expect(core.habitsForToday()).toMatchObject([{ name: "Read", state: "unrecorded" }]);
  });

  it("records Done, then Not done, then clears back to Unrecorded", () => {
    const { core } = makeCore();
    const habit = core.addHabit("Read");
    core.setState(habit.id, "done");
    expect(core.habitsForToday()).toMatchObject([{ state: "done" }]);
    core.setState(habit.id, "notDone");
    expect(core.habitsForToday()).toMatchObject([{ state: "notDone" }]);
    core.setState(habit.id, "unrecorded");
    expect(core.habitsForToday()).toMatchObject([{ state: "unrecorded" }]);
    core.setState(habit.id, "done");
    expect(core.habitsForToday()).toMatchObject([{ state: "done" }]);
  });

  it("switches directly between Done and Not done", () => {
    const { core } = makeCore();
    const habit = core.addHabit("Read");
    core.setState(habit.id, "done");
    core.setState(habit.id, "notDone");
    expect(core.habitsForToday()).toMatchObject([{ state: "notDone" }]);
    core.setState(habit.id, "done");
    expect(core.habitsForToday()).toMatchObject([{ state: "done" }]);
  });

  it("setting the current state again changes nothing", () => {
    const { core } = makeCore();
    const read = core.addHabit("Read");
    core.addHabit("Walk");
    core.setState(read.id, "unrecorded");
    expect(core.habitsForToday()).toMatchObject([{ state: "unrecorded" }, { state: "unrecorded" }]);
    core.setState(read.id, "notDone");
    core.setState(read.id, "notDone");
    expect(core.habitsForToday().map((h) => [h.name, h.state])).toEqual([
      ["Read", "notDone"],
      ["Walk", "unrecorded"],
    ]);
  });

  it("an answer belongs to today only", () => {
    const { core, setNow } = makeCore({ now: new Date("2026-03-10T23:00:00Z") });
    const habit = core.addHabit("Read");
    core.setState(habit.id, "notDone");
    setNow(new Date("2026-03-11T01:00:00Z"));
    expect(core.habitsForToday()).toMatchObject([{ state: "unrecorded" }]);
    expect(core.habitsOn("2026-03-10")).toMatchObject([{ state: "notDone" }]);
  });

  it("persists across reopening the database", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "habits-"));
    dirs.push(dir);
    const file = path.join(dir, "test.db");
    const now = () => new Date("2026-03-10T12:00:00Z");
    const first = createCore({ db: openDb(file), now, timeZone: "UTC" });
    first.setState(first.addHabit("Read").id, "done");
    first.setState(first.addHabit("Walk").id, "notDone");
    first.addHabit("Meditate");
    const second = createCore({ db: openDb(file), now, timeZone: "UTC" });
    expect(second.habitsForToday().map((h) => [h.name, h.state])).toEqual([
      ["Read", "done"],
      ["Walk", "notDone"],
      ["Meditate", "unrecorded"],
    ]);
  });

  it("reads a Check-in from before outcomes existed as Done", () => {
    const { core, db } = makeCore();
    const habit = core.addHabit("Read");
    // An old-style row, written without an outcome.
    db.run(sql`INSERT INTO check_ins (habit_id, day) VALUES (${habit.id}, '2026-03-10')`);
    expect(core.habitsForToday()).toMatchObject([{ state: "done" }]);
  });

  it("rejects a state other than Done, Not done or Unrecorded", () => {
    const { core } = makeCore();
    const habit = core.addHabit("Read");
    expect(() => core.setState(habit.id, "skipped" as HabitState)).toThrow(/state/i);
    expect(core.habitsForToday()).toMatchObject([{ state: "unrecorded" }]);
  });

  it("rejects an answer for an unknown Habit", () => {
    const { core } = makeCore();
    expect(() => core.setState(999, "done")).toThrow(/not found/i);
  });
});

describe("Moving between Days", () => {
  it("sets any state on a past Day without touching other Days", () => {
    const { core } = makeCore();
    const habit = core.addHabit("Read");
    core.setStartDay(habit.id, "2026-03-08");
    core.setState(habit.id, "done", "2026-03-08");
    core.setState(habit.id, "notDone", "2026-03-09");
    expect(core.habitsOn("2026-03-08")).toMatchObject([{ state: "done" }]);
    expect(core.habitsOn("2026-03-09")).toMatchObject([{ state: "notDone" }]);
    expect(core.habitsForToday()).toMatchObject([{ state: "unrecorded" }]);
    core.setState(habit.id, "unrecorded", "2026-03-08");
    expect(core.habitsOn("2026-03-08")).toMatchObject([{ state: "unrecorded" }]);
    expect(core.habitsOn("2026-03-09")).toMatchObject([{ state: "notDone" }]);
  });

  it("rejects listing and answering Days after today", () => {
    const { core } = makeCore();
    const habit = core.addHabit("Read");
    expect(() => core.habitsOn("2026-03-11")).toThrow(/future/i);
    expect(() => core.setState(habit.id, "done", "2026-03-11")).toThrow(/future/i);
    expect(() => core.setState(habit.id, "notDone", "2026-03-11")).toThrow(/future/i);
    expect(() => core.setState(habit.id, "unrecorded", "2026-03-11")).toThrow(/future/i);
    expect(core.habitsOn("2026-03-10")).toMatchObject([{ state: "unrecorded" }]);
  });

  it("rejects a malformed Day", () => {
    const { core } = makeCore();
    const habit = core.addHabit("Read");
    expect(() => core.habitsOn("yesterday")).toThrow(/day/i);
    expect(() => core.habitsOn("2026-02-30")).toThrow(/day/i);
    expect(() => core.setState(habit.id, "done", "2026-02-30")).toThrow(/day/i);
  });

  it("derives today across midnight in a non-UTC time zone", () => {
    const { core, setNow } = makeCore({
      now: new Date("2026-03-10T03:59:00Z"), // 23:59 in New York (EDT, UTC-4)
      timeZone: "America/New_York",
    });
    const habit = core.addHabit("Read");
    expect(core.today()).toBe("2026-03-09");
    expect(() => core.setState(habit.id, "done", "2026-03-10")).toThrow(/future/i);
    setNow(new Date("2026-03-10T04:00:00Z")); // midnight in New York
    expect(core.today()).toBe("2026-03-10");
    core.setState(habit.id, "done");
    expect(core.habitsOn("2026-03-10")).toMatchObject([{ state: "done" }]);
    expect(core.habitsOn("2026-03-09")).toMatchObject([{ state: "unrecorded" }]);
  });
});

describe("Start Day", () => {
  it("can be backdated, making the Habit appear Unrecorded and answerable on earlier Days", () => {
    const { core } = makeCore();
    const habit = core.addHabit("Read");
    expect(core.habitsOn("2026-03-08")).toEqual([]);
    expect(core.setStartDay(habit.id, "2026-03-08").startDay).toBe("2026-03-08");
    expect(core.habitsOn("2026-03-08")).toMatchObject([{ name: "Read", state: "unrecorded" }]);
    core.setState(habit.id, "notDone", "2026-03-08");
    expect(core.habitsOn("2026-03-08")).toMatchObject([{ state: "notDone" }]);
  });

  it("hides the Habit on Days before it and rejects answering there", () => {
    const { core } = makeCore();
    const habit = core.addHabit("Read");
    expect(core.habitsOn("2026-03-09")).toEqual([]);
    expect(() => core.setState(habit.id, "done", "2026-03-09")).toThrow(/start day/i);
    expect(() => core.setState(habit.id, "notDone", "2026-03-09")).toThrow(/start day/i);
    expect(() => core.setState(habit.id, "unrecorded", "2026-03-09")).toThrow(/start day/i);
    expect(core.habitsOn("2026-03-10")).toHaveLength(1);
  });

  it("rejects a future or malformed Start Day", () => {
    const { core } = makeCore();
    const habit = core.addHabit("Read");
    expect(() => core.setStartDay(habit.id, "2026-03-11")).toThrow(/future/i);
    expect(() => core.setStartDay(habit.id, "nope")).toThrow(/day/i);
    expect(core.getHabit(habit.id)?.startDay).toBe("2026-03-10");
  });

  it("rejects moving it past a Done Check-in, leaving it unchanged", () => {
    const { core } = makeCore();
    const habit = core.addHabit("Read");
    core.setStartDay(habit.id, "2026-03-05");
    core.setState(habit.id, "done", "2026-03-06");
    expect(() => core.setStartDay(habit.id, "2026-03-07")).toThrow(/check-in.*2026-03-06/i);
    expect(core.getHabit(habit.id)?.startDay).toBe("2026-03-05");
    expect(core.setStartDay(habit.id, "2026-03-06").startDay).toBe("2026-03-06");
  });

  it("rejects moving it past a Not done Check-in too", () => {
    const { core } = makeCore();
    const habit = core.addHabit("Read");
    core.setStartDay(habit.id, "2026-03-05");
    core.setState(habit.id, "notDone", "2026-03-07");
    expect(() => core.setStartDay(habit.id, "2026-03-08")).toThrow(/check-in.*2026-03-07/i);
    expect(core.getHabit(habit.id)?.startDay).toBe("2026-03-05");
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

  it("shows read-only with its Done, Not done or Unrecorded state on earlier Days", () => {
    const { core, setNow } = makeCore();
    const habit = core.addHabit("Read");
    core.setStartDay(habit.id, "2026-03-09");
    core.setState(habit.id, "notDone", "2026-03-09");
    core.setState(habit.id, "done");
    setNow(new Date("2026-03-12T12:00:00Z"));
    core.archiveHabit(habit.id);
    expect(core.habitsOn("2026-03-09")).toMatchObject([
      { name: "Read", state: "notDone", readOnly: true },
    ]);
    expect(core.habitsOn("2026-03-10")).toMatchObject([{ state: "done", readOnly: true }]);
    expect(core.habitsOn("2026-03-11")).toMatchObject([{ state: "unrecorded", readOnly: true }]);
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

  it("rejects any answer on an Archived Habit on any Day", () => {
    const { core, setNow } = makeCore();
    const habit = core.addHabit("Read");
    core.setState(habit.id, "done");
    setNow(new Date("2026-03-12T12:00:00Z"));
    core.archiveHabit(habit.id);
    expect(() => core.setState(habit.id, "unrecorded", "2026-03-10")).toThrow(/archived/i);
    expect(() => core.setState(habit.id, "notDone", "2026-03-11")).toThrow(/archived/i);
    expect(() => core.setState(habit.id, "done")).toThrow(/archived/i);
    expect(core.habitsOn("2026-03-10")).toMatchObject([{ state: "done" }]);
  });

  it("lists active Habits for management, excluding Archived ones", () => {
    const { core } = makeCore();
    const read = core.addHabit("Read");
    core.addHabit("Walk");
    core.archiveHabit(read.id);
    expect(core.activeHabits()).toMatchObject([{ name: "Walk", startDay: "2026-03-10" }]);
  });

  it("lists Archived Habits, and Restore makes them active again with no gap", () => {
    const { core, setNow } = makeCore();
    const habit = core.addHabit("Read");
    core.addHabit("Walk");
    core.setState(habit.id, "done");
    setNow(new Date("2026-03-11T12:00:00Z"));
    core.setState(habit.id, "notDone");
    setNow(new Date("2026-03-12T12:00:00Z"));
    core.archiveHabit(habit.id);
    expect(core.archivedHabits().map((h) => h.name)).toEqual(["Read"]);

    core.restoreHabit(habit.id);
    expect(core.archivedHabits()).toEqual([]);
    // Active on every Day since its Start Day, including the archived gap.
    expect(core.habitsOn("2026-03-11")).toMatchObject([
      { name: "Read", state: "notDone", readOnly: false },
      { name: "Walk" },
    ]);
    expect(core.habitsOn("2026-03-10")[0]).toMatchObject({ state: "done" });
    core.setState(habit.id, "done");
    expect(core.habitsForToday()[0]).toMatchObject({ state: "done" });
  });

  it("throws for an unknown Habit", () => {
    const { core } = makeCore();
    expect(() => core.archiveHabit(99)).toThrow(/not found/);
    expect(() => core.restoreHabit(99)).toThrow(/not found/);
  });
});

describe("Deleting a Habit", () => {
  it("removes the Habit, leaving other Habits and their Check-ins alone", () => {
    const { core, setNow } = makeCore();
    const read = core.addHabit("Read");
    const walk = core.addHabit("Walk");
    core.setState(read.id, "done");
    core.setState(walk.id, "notDone");
    setNow(new Date("2026-03-11T12:00:00Z"));
    core.setState(read.id, "notDone");
    core.archiveHabit(read.id);

    core.deleteHabit(read.id);

    expect(core.getHabit(read.id)).toBeUndefined();
    expect(core.archivedHabits()).toEqual([]);
    expect(core.habitsOn("2026-03-10").map((h) => [h.name, h.state])).toEqual([
      ["Walk", "notDone"],
    ]);
    expect(core.habitsOn("2026-03-11").map((h) => [h.name, h.state])).toEqual([
      ["Walk", "unrecorded"],
    ]);
  });

  it("throws for an unknown Habit", () => {
    const { core } = makeCore();
    expect(() => core.deleteHabit(99)).toThrow(/not found/);
  });
});
