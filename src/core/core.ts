import { and, asc, eq, getTableColumns, gt, isNotNull, isNull, lte, min, or } from "drizzle-orm";
import type { Db } from "./db";
import { dayOf, isValidDay, type Day } from "./day";
import { checkIns, habits } from "./schema";

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

export function createCore({ db, now, timeZone }: CoreDeps) {
  const today = (): Day => dayOf(now(), timeZone);

  /** Throws unless `day` is a real calendar date no later than today. */
  const assertViewable = (day: Day): void => {
    if (!isValidDay(day)) throw new Error(`Invalid Day: ${day}`);
    if (day > today()) throw new Error(`Day ${day} is in the future`);
  };

  /** Habits with their state on `day` (today or earlier). */
  function habitsOn(day: Day): HabitOnDay[] {
    assertViewable(day);
    return db
      .select({ ...getTableColumns(habits), outcome: checkIns.outcome })
      .from(habits)
      .leftJoin(checkIns, and(eq(checkIns.habitId, habits.id), eq(checkIns.day, day)))
      .where(
        and(lte(habits.startDay, day), or(isNull(habits.archiveDay), gt(habits.archiveDay, day))),
      )
      .orderBy(asc(habits.id))
      .all()
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
      return db
        .insert(habits)
        .values({ name, startDay: today(), createdAt: now() })
        .returning()
        .get();
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
