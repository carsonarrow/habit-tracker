import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCore } from "@/core";
import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { addHabit } from "../actions";

export const dynamic = "force-dynamic";

export default function ManageHabitsPage() {
  const habits = getCore().activeHabits();

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-6">
      <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Back to Day
      </Link>
      <h1 className="text-xl font-semibold">Manage Habits</h1>

      {habits.length === 0 ? (
        <p className="text-muted-foreground">No Habits yet. Add one below.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {habits.map((habit) => (
            <li key={habit.id}>
              <Link
                href={`/habits/${habit.id}`}
                aria-label={`Edit ${habit.name}`}
                className="flex items-center gap-3 rounded-md border px-3 py-2"
              >
                <span className="flex-1">{habit.name}</span>
                <span className="text-sm text-muted-foreground">Since {habit.startDay}</span>
                <Pencil className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <form action={addHabit} className="flex gap-2">
        <Input name="name" placeholder="New Habit" aria-label="Habit name" required />
        <Button type="submit">Add</Button>
      </form>

      <Link href="/archived" className="text-sm text-muted-foreground">
        Archived Habits
      </Link>
    </main>
  );
}
