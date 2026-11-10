import { and, asc, eq, getTableColumns, isNotNull } from "drizzle-orm";
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

/** A Habit plus whether it has a Check-in today. */
export type HabitOnDay = Habit & { checkedIn: boolean };

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
      .orderBy(asc(habits.id))
      .all()
      .map((h) => ({ ...h, checkedIn: Boolean(h.checkedIn) }));
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
    habitsForToday(): HabitOnDay[] {
      return habitsOn(today());
    },
    /** Ticks or unticks a Habit on `day` (default today). Returns whether it is now checked in. */
    toggleCheckIn(habitId: number, day: Day = today()): boolean {
      assertViewable(day);
      return db.transaction((tx) => {
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
