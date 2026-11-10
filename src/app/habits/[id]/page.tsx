import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCore } from "@/core";
import { isValidDay } from "@/core/day";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { archiveHabit, renameHabit, setStartDay } from "../../actions";

export const dynamic = "force-dynamic";

export default async function HabitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ day?: string; error?: string }>;
}) {
  const { id } = await params;
  const { day, error } = await searchParams;
  const core = getCore();
  const habit = /^\d+$/.test(id) ? core.getHabit(Number(id)) : undefined;
  if (!habit) notFound();
  const backDay = day && isValidDay(day) ? day : core.today();
  const back = `/?day=${backDay}`;

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-6">
      <Link href={back} className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Back to Day
      </Link>
      <h1 className="text-xl font-semibold">Edit Habit</h1>
      <form action={renameHabit.bind(null, habit.id, backDay)} className="flex gap-2">
        <Input name="name" defaultValue={habit.name} aria-label="Habit name" required />
        <Button type="submit">Save</Button>
      </form>
      <form action={setStartDay.bind(null, habit.id, backDay)} className="flex flex-col gap-2">
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
      {habit.archiveDay === null && (
        <form action={archiveHabit.bind(null, habit.id, backDay)}>
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
