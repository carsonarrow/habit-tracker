import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { createCore } from "./core";
import { openDb } from "./db";

export type { Habit, HabitOnDay, HabitState } from "./core";

type Core = ReturnType<typeof createCore>;

const globalForCore = globalThis as unknown as { core?: Core };

/** The app-wide core, opened once per process (migrations run on first use). */
export function getCore(): Core {
  if (!globalForCore.core) {
    const file = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "habits.db");
    mkdirSync(path.dirname(file), { recursive: true });
    globalForCore.core = createCore({
      db: openDb(file),
      now: () => new Date(),
      timeZone: process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }
  return globalForCore.core;
}
