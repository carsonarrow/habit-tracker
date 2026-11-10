import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCore } from "@/core";
import { isValidDay } from "@/core/day";
import { Check, Pencil } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DayNav } from "./day-nav";
import { addHabit, toggleCheckIn } from "./actions";

export const dynamic = "force-dynamic";

export default async function DayPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const core = getCore();
  const today = core.today();
  const { day = today } = await searchParams;
  // Malformed or future Day: fall back to today.
  if (!isValidDay(day) || day > today) redirect("/");
  const habits = core.habitsOn(day);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-6">
      <DayNav day={day} today={today} />

      {habits.length === 0 ? (
        <p className="text-muted-foreground">No Habits yet. Add one below.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {habits.map((habit) => (
            <li key={habit.id} className="flex items-center gap-2">
              <form action={toggleCheckIn.bind(null, habit.id, day)} className="flex-1">
                <button
                  type="submit"
                  disabled={habit.readOnly}
                  aria-pressed={habit.checkedIn}
                  className="flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left aria-pressed:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex size-5 items-center justify-center rounded border">
                    {habit.checkedIn && <Check className="size-4" />}
                  </span>
                  <span className={habit.checkedIn ? "text-muted-foreground line-through" : ""}>
                    {habit.name}
                  </span>
                </button>
              </form>
              {!habit.readOnly && (
                <Link
                  href={`/habits/${habit.id}?day=${day}`}
                  aria-label={`Edit ${habit.name}`}
                  className="p-2 text-muted-foreground"
                >
                  <Pencil className="size-4" />
                </Link>
              )}
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
