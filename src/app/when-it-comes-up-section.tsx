"use client";

import { ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { WhenItComesUpSummary } from "./when-it-comes-up";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * The Day page's collapsible "When it comes up" section. It starts in its default state and isn't
 * remembered: the open state is seeded once, so recording or clearing a Check-in doesn't snap it
 * open or shut, and the page keys it by Day so each Day (and each page load) starts afresh.
 */
export function WhenItComesUpSection({
  summary,
  children,
}: {
  summary: WhenItComesUpSummary;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(summary.defaultOpen);
  return (
    <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)} className="group">
      <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md py-1 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
        <span className="flex-1">When it comes up</span>
        <span className="font-normal">
          {plural(summary.count, "Habit")} · {plural(summary.checkedIn, "Check-in")}
        </span>
      </summary>
      <div className="pt-2">{children}</div>
    </details>
  );
}
