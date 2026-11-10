import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const habits = sqliteTable("habits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  // A Day, as an ISO date (YYYY-MM-DD) in the configured time zone.
  startDay: text("start_day").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/** A Check-in: at most one per (Habit, Day), enforced by the primary key. */
export const checkIns = sqliteTable(
  "check_ins",
  {
    habitId: integer("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
  },
  (t) => [primaryKey({ columns: [t.habitId, t.day] })],
);
