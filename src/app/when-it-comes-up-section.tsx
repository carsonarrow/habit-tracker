"use client";

import type { HabitOnDay } from "@/core";
import { ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * The Day page's collapsible "When it comes up" section for a Day's Opportunistic Habits. Its
 * header counts them and their Check-ins. It starts collapsed, or open when any has a Check-in,
 * and isn't remembered: the open state is seeded once, so recording or clearing a Check-in doesn't
 * snap it open or shut, and the page keys it by Day so each Day (and each page load) starts afresh.
 */
export function WhenItComesUpSection({
  habits,
  children,
}: {
  habits: readonly HabitOnDay[];
  children: ReactNode;
}) {
  const checkedIn = habits.filter((h) => h.state !== "unrecorded").length;
  const [open, setOpen] = useState(checkedIn > 0);
  return (
    <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)} className="group">
      <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md py-1 text-sm text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
        <h2 className="flex-1 font-medium">When it comes up</h2>
        <span>
          {plural(habits.length, "Habit")} · {plural(checkedIn, "Check-in")}
        </span>
      </summary>
      <div className="pt-2">{children}</div>
    </details>
  );
}
