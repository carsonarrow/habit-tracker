import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCore } from "@/core";
import { weekdays, type Weekday } from "@/core/day";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { archiveHabit, renameHabit, setSchedule, setStartDay } from "../../actions";

export const dynamic = "force-dynamic";

const weekdayLabels: Record<Weekday, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export default async function HabitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; scheduleError?: string }>;
}) {
  const { id } = await params;
  const { error, scheduleError } = await searchParams;
  const core = getCore();
  const habit = /^\d+$/.test(id) ? core.getHabit(Number(id)) : undefined;
  if (!habit) notFound();
  const archived = habit.archiveDay !== null;
  const schedule = core.scheduleOf(habit.id);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-6">
      <Link href="/habits" className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Back to Habits
      </Link>
      <h1 className="text-xl font-semibold">Edit Habit</h1>
      <form action={renameHabit.bind(null, habit.id)} className="flex gap-2">
        <Input name="name" defaultValue={habit.name} aria-label="Habit name" required />
        <Button type="submit">Save</Button>
      </form>
      <form action={setStartDay.bind(null, habit.id)} className="flex flex-col gap-2">
        <label htmlFor="startDay" className="text-sm font-medium">
          Start Day
        </label>
        <div className="flex gap-2">
          <Input
            id="startDay"
            name="startDay"
            type="date"
            defaultValue={habit.startDay}
            max={core.today()}
            required
          />
          <Button type="submit">Save</Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          The Habit won&apos;t appear on Days before this. It can&apos;t move past an existing
          Check-in.
        </p>
      </form>
      {/* An Archived Habit's Schedule can't change, so its section is hidden. */}
      {!archived && (
        <form action={setSchedule.bind(null, habit.id)} className="flex flex-col gap-2">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Schedule</legend>
            <div className="flex flex-wrap gap-2">
              {weekdays.map((day) => (
                <label
                  key={day}
                  className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm has-checked:bg-muted"
                >
                  <input
                    type="checkbox"
                    name="weekdays"
                    value={day}
                    defaultChecked={schedule.weekdays.includes(day)}
                  />
                  {weekdayLabels[day]}
                </label>
              ))}
            </div>
          </fieldset>
          <Button type="submit" className="self-start">
            Save
          </Button>
          {scheduleError && (
            <p role="alert" className="text-sm text-destructive">
              {scheduleError}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            The days of the week the Habit is due. A change applies from today; earlier Days keep
            the Schedule they had.
          </p>
        </form>
      )}
      {!archived && (
        <form action={archiveHabit.bind(null, habit.id)}>
          <Button type="submit" variant="outline">
            Archive Habit
          </Button>
          <p className="mt-2 text-sm text-muted-foreground">
            Hides the Habit from today on. Earlier Days still show it, read-only.
          </p>
        </form>
      )}
    </main>
  );
}
