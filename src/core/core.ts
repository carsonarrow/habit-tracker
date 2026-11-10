import { asc } from "drizzle-orm";
import type { Db } from "./db";
import { dayOf, type Day } from "./day";
import { habits } from "./schema";

export type CoreDeps = {
  db: Db;
  /** The current instant. */
  now: () => Date;
  /** IANA time zone that defines Day boundaries. */
  timeZone: string;
};

export type Habit = typeof habits.$inferSelect;

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
    habitsForToday(): Habit[] {
      return db.select().from(habits).orderBy(asc(habits.id)).all();
    },
  };
}
