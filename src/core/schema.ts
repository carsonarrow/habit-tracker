import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const habits = sqliteTable("habits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  // A Day, as an ISO date (YYYY-MM-DD) in the configured time zone.
  startDay: text("start_day").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
