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
