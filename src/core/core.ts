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

/** A Habit plus its Check-in state on a Day; `readOnly` when it is archived (shown only before its archive Day). */
export type HabitOnDay = Habit & { checkedIn: boolean; readOnly: boolean };

export function createCore({ db, now, timeZone }: CoreDeps) {
  const today = (): Day => dayOf(now(), timeZone);

  /** Throws unless `day` is a real calendar date no later than today. */
  const assertViewable = (day: Day): void => {
    if (!isValidDay(day)) throw new Error(`Invalid Day: ${day}`);
    if (day > today()) throw new Error(`Day ${day} is in the future`);
  };

  /** Habits with their Check-in state on `day` (today or earlier). */
  function habitsOn(day: Day): HabitOnDay[] {
    assertViewable(day);
    return db
      .select({ ...getTableColumns(habits), checkedIn: isNotNull(checkIns.day) })
      .from(habits)
      .leftJoin(checkIns, and(eq(checkIns.habitId, habits.id), eq(checkIns.day, day)))
      .where(
        and(lte(habits.startDay, day), or(isNull(habits.archiveDay), gt(habits.archiveDay, day))),
      )
      .orderBy(asc(habits.id))
      .all()
      .map((h) => ({
        ...h,
        checkedIn: Boolean(h.checkedIn),
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
    /** Ticks or unticks a Habit on `day` (default today). Returns whether it is now checked in. */
    toggleCheckIn(habitId: number, day: Day = today()): boolean {
      assertViewable(day);
      return db.transaction((tx) => {
        const habit = tx.select().from(habits).where(eq(habits.id, habitId)).get();
        if (!habit) throw new Error(`Habit ${habitId} not found`);
        if (habit.archiveDay !== null) throw new Error(`Habit ${habitId} is archived`);
        if (day < habit.startDay) {
          throw new Error(`Day ${day} is before the Habit's Start Day ${habit.startDay}`);
        }
        const removed = tx
          .delete(checkIns)
          .where(and(eq(checkIns.habitId, habitId), eq(checkIns.day, day)))
          .run();
        if (removed.changes > 0) return false;
        tx.insert(checkIns).values({ habitId, day }).run();
        return true;
      });
    },
  };
}
