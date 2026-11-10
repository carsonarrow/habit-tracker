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
