import { getCore } from "@/core";
import { isValidDay } from "@/core/day";
import { Check, Settings } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DayNav } from "./day-nav";
import { toggleCheckIn } from "./actions";

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
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <DayNav day={day} today={today} />
        </div>
        <Link href="/habits" aria-label="Manage Habits" className="p-2 text-muted-foreground">
          <Settings className="size-5" />
        </Link>
      </div>

      {habits.length === 0 ? (
        <p className="text-muted-foreground">
          No Habits yet.{" "}
          <Link href="/habits" className="underline">
            Add one
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {habits.map((habit) => (
            <li key={habit.id}>
              <form action={toggleCheckIn.bind(null, habit.id, day)}>
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
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
