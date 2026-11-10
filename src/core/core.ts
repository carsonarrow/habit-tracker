import { and, asc, eq, getTableColumns, isNotNull } from "drizzle-orm";
import type { Db } from "./db";
import { dayOf, type Day } from "./day";
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

  return {
    today,
    addHabit(rawName: string): Habit {
      const name = rawName.trim();
      if (!name) throw new Error("A Habit needs a name");
      return db
        .insert(habits)
        .values({ name, startDay: today(), createdAt: now() })
        .returning()
        .get();
    },
    habitsForToday(): HabitOnDay[] {
      return db
        .select({ ...getTableColumns(habits), checkedIn: isNotNull(checkIns.day) })
        .from(habits)
        .leftJoin(checkIns, and(eq(checkIns.habitId, habits.id), eq(checkIns.day, today())))
        .orderBy(asc(habits.id))
        .all()
        .map((h) => ({ ...h, checkedIn: Boolean(h.checkedIn) }));
    },
    /** Ticks or unticks a Habit for today. Returns whether it is now checked in. */
    toggleCheckIn(habitId: number): boolean {
      const day = today();
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
