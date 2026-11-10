"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addDays, type Day } from "@/core/day";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Parses a Day (YYYY-MM-DD) as a local calendar date, for the picker. */
function toLocalDate(day: Day): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, 12); // noon: safe across DST gaps
}

function toDay(date: Date): Day {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function DayNav({ day, today }: { day: Day; today: Day }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const go = (target: Day) => router.push(target === today ? "/" : `/?day=${target}`);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        aria-label="Previous Day"
        onClick={() => go(addDays(day, -1))}
      >
        <ChevronLeft />
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="flex-1 text-lg font-semibold">
            <time dateTime={day}>{day}</time>
            {day === today && <span className="text-muted-foreground text-sm">Today</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            mode="single"
            selected={toLocalDate(day)}
            defaultMonth={toLocalDate(day)}
            disabled={{ after: toLocalDate(today) }}
            onSelect={(date) => {
              if (!date) return;
              setOpen(false);
              go(toDay(date));
            }}
          />
        </PopoverContent>
      </Popover>
      <Button
        variant="outline"
        size="icon"
        aria-label="Next Day"
        disabled={day >= today}
        onClick={() => go(addDays(day, 1))}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
