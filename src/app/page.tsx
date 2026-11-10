import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCore } from "@/core";
import { addHabit } from "./actions";

export const dynamic = "force-dynamic";

export default function DayPage() {
  const core = getCore();
  const today = core.today();
  const habits = core.habitsForToday();

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">
        <time dateTime={today}>{today}</time>
      </h1>

      {habits.length === 0 ? (
        <p className="text-muted-foreground">No Habits yet. Add one below.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {habits.map((habit) => (
            <li key={habit.id} className="rounded-md border px-3 py-2">
              {habit.name}
            </li>
          ))}
        </ul>
      )}

      <form action={addHabit} className="flex gap-2">
        <Input name="name" placeholder="New Habit" aria-label="Habit name" required />
        <Button type="submit">Add</Button>
      </form>
    </main>
  );
}
