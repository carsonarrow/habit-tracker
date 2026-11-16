import { and, asc, eq, getTableColumns, gt, isNotNull, isNull, lte, min, or } from "drizzle-orm";
import type { Db } from "./db";
import { dayOf, isValidDay, weekdayOf, weekdays, type Day, type Weekday } from "./day";
import { checkIns, habits, schedules } from "./schema";

export type CoreDeps = {
  db: Db;
  /** The current instant. */
  now: () => Date;
  /** IANA time zone that defines Day boundaries. */
  timeZone: string;
};

export type Habit = typeof habits.$inferSelect;

/** A Habit's state on a Day it is tracked: a Check-in's outcome, or Unrecorded when there is none. */
const habitStates = ["done", "notDone", "unrecorded"] as const;
export type HabitState = (typeof habitStates)[number];

/** A Habit plus its state on a Day; `readOnly` when it is archived (shown only before its archive Day). */
export type HabitOnDay = Habit & { state: HabitState; readOnly: boolean };

/** A Schedule: the weekdays a Habit is due on, in Mon..Sun order. */
export type Schedule = Weekday[];

const parseSchedule = (stored: string): Schedule => stored.split(",") as Schedule;
const formatSchedule = (schedule: Schedule): string => schedule.join(",");

/** Checks client input is a non-empty set of weekdays; returns it in Mon..Sun order without duplicates. */
function cleanSchedule(raw: readonly string[]): Schedule {
  const invalid = raw.find((d) => !(weekdays as readonly string[]).includes(d));
  if (invalid !== undefined) throw new Error(`Not a weekday: ${invalid}`);
  if (raw.length === 0) throw new Error("A Schedule needs at least one weekday");
  return weekdays.filter((d) => raw.includes(d));
}

/** One entry in a Habit's Schedule history, effective from `effectiveDay`. */
type ScheduleVersion = { effectiveDay: Day; schedule: Schedule };

const toVersion = (row: { effectiveDay: Day; weekdays: string }): ScheduleVersion => ({
  effectiveDay: row.effectiveDay,
  schedule: parseSchedule(row.weekdays),
});

/** The Schedule for `day`: the latest version effective on or before it, else the earliest. */
function scheduleOnDay(versions: ScheduleVersion[], day: Day): Schedule {
  // `versions` is sorted by effective Day.
  const version = versions.findLast((v) => v.effectiveDay <= day) ?? versions[0];
  // Every Habit gets a version when added (or by migration), so none is a broken invariant.
  if (!version) throw new Error("Habit has no Schedule");
  return version.schedule;
}

export function createCore({ db, now, timeZone }: CoreDeps) {
  const today = (): Day => dayOf(now(), timeZone);

  /** A Habit's Schedule versions, oldest first. */
  const versionsOf = (tx: Pick<Db, "select">, habitId: number): ScheduleVersion[] =>
    tx
      .select()
      .from(schedules)
      .where(eq(schedules.habitId, habitId))
      .orderBy(asc(schedules.effectiveDay))
      .all()
      .map(toVersion);

  /** Throws unless `day` is a real calendar date no later than today. */
  const assertViewable = (day: Day): void => {
    if (!isValidDay(day)) throw new Error(`Invalid Day: ${day}`);
    if (day > today()) throw new Error(`Day ${day} is in the future`);
  };

  const isDue = (versions: ScheduleVersion[], day: Day): boolean =>
    scheduleOnDay(versions, day).includes(weekdayOf(day));

  /** Habits due on `day` (today or earlier), with their state there. */
  function habitsOn(day: Day): HabitOnDay[] {
    assertViewable(day);
    const versionsByHabit = new Map(
      Map.groupBy(
        db.select().from(schedules).orderBy(asc(schedules.effectiveDay)).all(),
        (row) => row.habitId,
      )
        .entries()
        .map(([habitId, rows]) => [habitId, rows.map(toVersion)]),
    );
    return db
      .select({ ...getTableColumns(habits), outcome: checkIns.outcome })
      .from(habits)
      .leftJoin(checkIns, and(eq(checkIns.habitId, habits.id), eq(checkIns.day, day)))
      .where(
        and(lte(habits.startDay, day), or(isNull(habits.archiveDay), gt(habits.archiveDay, day))),
      )
      .orderBy(asc(habits.id))
      .all()
      .filter((h) => isDue(versionsByHabit.get(h.id) ?? [], day))
      .map(({ outcome, ...h }) => ({
        ...h,
        state: outcome ?? "unrecorded",
        readOnly: h.archiveDay !== null,
      }));
  }

  /** Trims a Habit name; throws if it is blank. */
  const cleanName = (rawName: string): string => {
    const name = rawName.trim();
    if (!name) throw new Error("A Habit needs a name");
    return name;
  };

  return {
    today,
    habitsOn,
    addHabit(rawName: string): Habit {
      const name = cleanName(rawName);
      return db.transaction((tx) => {
        const habit = tx
          .insert(habits)
          .values({ name, startDay: today(), createdAt: now() })
          .returning()
          .get();
        tx.insert(schedules)
          .values({
            habitId: habit.id,
            effectiveDay: habit.startDay,
            weekdays: formatSchedule([...weekdays]),
          })
          .run();
        return habit;
      });
    },
    /** The Schedule in effect today. */
    scheduleOf(id: number): Schedule {
      if (!this.getHabit(id)) throw new Error(`Habit ${id} not found`);
      return scheduleOnDay(versionsOf(db, id), today());
    },
    /**
     * Sets a Habit's Schedule from today on; Days before today keep theirs (ADR 0001).
     * Saving again the same Day replaces today's version; saving the current Schedule is a no-op.
     * Rejected for an Archived Habit, and if it would make the Habit not due today while it
     * has a Check-in today.
     */
    setSchedule(id: number, rawSchedule: readonly string[]): Schedule {
      const schedule = cleanSchedule(rawSchedule);
      const day = today();
      db.transaction((tx) => {
        const habit = tx.select().from(habits).where(eq(habits.id, id)).get();
        if (!habit) throw new Error(`Habit ${id} not found`);
        if (habit.archiveDay !== null) {
          throw new Error(`Habit ${id} is archived; restore it to change its Schedule`);
        }
        const versions = versionsOf(tx, id);
        const current = scheduleOnDay(versions, day);
        if (formatSchedule(current) === formatSchedule(schedule)) return;
        if (!schedule.includes(weekdayOf(day))) {
          const checkIn = tx
            .select()
            .from(checkIns)
            .where(and(eq(checkIns.habitId, id), eq(checkIns.day, day)))
            .get();
          if (checkIn) {
            throw new Error(
              "Habit has a Check-in today, so its Schedule must keep today's weekday. " +
                "Clear today's Check-in first to change that.",
            );
          }
        }
        // Replacing today's version would also rewrite Days before today when it is the
        // earliest (it covers a backdated Start Day), so keep it for those Days first.
        if (versions[0].effectiveDay === day && habit.startDay < day) {
          tx.insert(schedules)
            .values({
              habitId: id,
              effectiveDay: habit.startDay,
              weekdays: formatSchedule(current),
            })
            .run();
        }
        tx.insert(schedules)
          .values({ habitId: id, effectiveDay: day, weekdays: formatSchedule(schedule) })
          .onConflictDoUpdate({
            target: [schedules.habitId, schedules.effectiveDay],
            set: { weekdays: formatSchedule(schedule) },
          })
          .run();
      });
      return schedule;
    },
    getHabit(id: number): Habit | undefined {
      return db.select().from(habits).where(eq(habits.id, id)).get();
    },
    /** Renames a Habit; its Check-ins are untouched. */
    renameHabit(id: number, rawName: string): Habit {
      const name = cleanName(rawName);
      const updated = db.update(habits).set({ name }).where(eq(habits.id, id)).returning().get();
      if (!updated) throw new Error(`Habit ${id} not found`);
      return updated;
    },
    /**
     * Sets a Habit's Start Day (today or earlier). Rejected if the Habit already
     * has a Check-in before the new Start Day, so history is never hidden.
     */
    setStartDay(id: number, day: Day): Habit {
      assertViewable(day);
      return db.transaction((tx) => {
        const habit = tx.select().from(habits).where(eq(habits.id, id)).get();
        if (!habit) throw new Error(`Habit ${id} not found`);
        const first = tx
          .select({ day: min(checkIns.day) })
          .from(checkIns)
          .where(eq(checkIns.habitId, id))
          .get()?.day;
        if (first && first < day) {
          throw new Error(`Habit has a Check-in on ${first}, before Start Day ${day}`);
        }
        return tx.update(habits).set({ startDay: day }).where(eq(habits.id, id)).returning().get();
      });
    },
    /** Archives a Habit as of today; already-archived Habits keep their archive Day. */
    archiveHabit(id: number): Habit {
      const updated = db
        .update(habits)
        .set({ archiveDay: today() })
        .where(and(eq(habits.id, id), isNull(habits.archiveDay)))
        .returning()
        .get();
      const habit = updated ?? this.getHabit(id);
      if (!habit) throw new Error(`Habit ${id} not found`);
      return habit;
    },
    /** Makes an Archived Habit active again, with no gap. */
    restoreHabit(id: number): Habit {
      const updated = db
        .update(habits)
        .set({ archiveDay: null })
        .where(eq(habits.id, id))
        .returning()
        .get();
      if (!updated) throw new Error(`Habit ${id} not found`);
      return updated;
    },
    /** Permanently removes a Habit; its Check-ins go with it (cascade). */
    deleteHabit(id: number): void {
      const deleted = db.delete(habits).where(eq(habits.id, id)).returning().get();
      if (!deleted) throw new Error(`Habit ${id} not found`);
    },
    /** Habits that are not archived, regardless of Day; for management. */
    activeHabits(): Habit[] {
      return db
        .select()
        .from(habits)
        .where(isNull(habits.archiveDay))
        .orderBy(asc(habits.id))
        .all();
    },
    archivedHabits(): Habit[] {
      return db
        .select()
        .from(habits)
        .where(isNotNull(habits.archiveDay))
        .orderBy(asc(habits.id))
        .all();
    },
    habitsForToday(): HabitOnDay[] {
      return habitsOn(today());
    },
    /**
     * Makes `state` the Habit's state on `day` (default today): records a Check-in
     * for Done or Not done, removes it for Unrecorded. Setting the current state is a no-op.
     */
    setState(habitId: number, state: HabitState, day: Day = today()): void {
      // Server actions pass client input straight through, so check it at runtime.
      if (!habitStates.includes(state)) throw new Error(`Invalid state: ${state}`);
      assertViewable(day);
      db.transaction((tx) => {
        const habit = tx.select().from(habits).where(eq(habits.id, habitId)).get();
        if (!habit) throw new Error(`Habit ${habitId} not found`);
        if (habit.archiveDay !== null) throw new Error(`Habit ${habitId} is archived`);
        if (day < habit.startDay) {
          throw new Error(`Day ${day} is before the Habit's Start Day ${habit.startDay}`);
        }
        if (!isDue(versionsOf(tx, habitId), day)) {
          throw new Error(`Habit ${habitId} is not due on ${day}`);
        }
        if (state === "unrecorded") {
          tx.delete(checkIns)
            .where(and(eq(checkIns.habitId, habitId), eq(checkIns.day, day)))
            .run();
          return;
        }
        tx.insert(checkIns)
          .values({ habitId, day, outcome: state })
          .onConflictDoUpdate({ target: [checkIns.habitId, checkIns.day], set: { outcome: state } })
          .run();
      });
    },
  };
}
