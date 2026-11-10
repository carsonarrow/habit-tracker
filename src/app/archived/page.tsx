import { Button } from "@/components/ui/button";
import { getCore } from "@/core";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { restoreHabit } from "../actions";

export const dynamic = "force-dynamic";

export default function ArchivedPage() {
  const habits = getCore().archivedHabits();

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-6">
      <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Back to Day
      </Link>
      <h1 className="text-xl font-semibold">Archived Habits</h1>
      {habits.length === 0 ? (
        <p className="text-muted-foreground">No Archived Habits.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {habits.map((habit) => (
            <li key={habit.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
              <span className="flex-1">{habit.name}</span>
              <form action={restoreHabit.bind(null, habit.id)}>
                <Button type="submit" variant="outline" size="sm">
                  Restore
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
