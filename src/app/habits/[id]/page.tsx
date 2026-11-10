import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCore } from "@/core";
import { isValidDay } from "@/core/day";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { renameHabit } from "../../actions";

export const dynamic = "force-dynamic";

export default async function HabitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ day?: string }>;
}) {
  const { id } = await params;
  const { day } = await searchParams;
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
    </main>
  );
}
