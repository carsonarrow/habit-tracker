import { getCore, type HabitOnDay, type HabitState } from "@/core";
import { isValidDay, type Day } from "@/core/day";
import { Check, Settings, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DayNav } from "./day-nav";
import { setState } from "./actions";
import { cn } from "@/lib/utils";

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
    <main className="mx-auto flex max-w-md flex-col gap-6 p-6 pt-14 md:pt-6">
      <Link
        href="/habits"
        aria-label="Manage Habits"
        className="absolute top-3 right-3 rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <Settings className="size-5" />
      </Link>
      <DayNav day={day} today={today} />

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
            <li
              key={habit.id}
              className="flex items-center gap-2 rounded-md border py-1 pr-1 pl-3 data-[state=done]:bg-muted"
              data-state={habit.state}
            >
              <span
                className={cn("flex-1", habit.state !== "unrecorded" && "text-muted-foreground")}
              >
                {habit.name}
              </span>
              <StateButton habit={habit} day={day} outcome="notDone" />
              <StateButton habit={habit} day={day} outcome="done" />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

type Outcome = Exclude<HabitState, "unrecorded">;

// Unpressed, hover previews the outcome's colour; pressed, hover darkens the fill (a click clears it).
const outcomeButtons: Record<Outcome, { label: string; Icon: LucideIcon; styles: string }> = {
  done: {
    label: "Done",
    Icon: Check,
    styles:
      "enabled:hover:border-primary enabled:hover:text-primary aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground enabled:aria-pressed:hover:bg-primary/90 enabled:aria-pressed:hover:text-primary-foreground",
  },
  notDone: {
    label: "Not done",
    Icon: X,
    styles:
      "enabled:hover:border-destructive enabled:hover:text-destructive aria-pressed:border-destructive aria-pressed:bg-destructive aria-pressed:text-white enabled:aria-pressed:hover:bg-destructive/90 enabled:aria-pressed:hover:text-white",
  },
};

/** Records `outcome`, or clears back to Unrecorded when it is already the Habit's state. */
function StateButton({ habit, day, outcome }: { habit: HabitOnDay; day: Day; outcome: Outcome }) {
  const { label, Icon, styles } = outcomeButtons[outcome];
  const active = habit.state === outcome;
  return (
    <form action={setState.bind(null, habit.id, active ? "unrecorded" : outcome, day)}>
      <button
        type="submit"
        disabled={habit.readOnly}
        aria-pressed={active}
        aria-label={`${label}: ${habit.name}`}
        className={cn(
          "flex size-9 items-center justify-center rounded-md border text-muted-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-60",
          styles,
        )}
      >
        <Icon className="size-4" />
      </button>
    </form>
  );
}
