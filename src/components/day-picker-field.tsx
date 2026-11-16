"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDay, fromLocalDate, toLocalDate, type Day } from "@/core/day";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";

/**
 * A form field that picks a Day from a calendar, no later than `today`; submits it as `name`.
 * `labelId` names the field's visible label, so the button announces it along with the chosen Day.
 */
export function DayPickerField({
  id,
  labelId,
  name,
  defaultValue,
  today,
}: {
  id: string;
  labelId: string;
  name: string;
  defaultValue: Day;
  today: Day;
}) {
  const [day, setDay] = useState(defaultValue);
  const [open, setOpen] = useState(false);

  return (
    <>
      <input type="hidden" name={name} value={day} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            aria-labelledby={`${labelId} ${id}`}
            type="button"
            variant="outline"
            className="flex-1 justify-start font-normal"
          >
            <CalendarIcon className="text-muted-foreground" />
            <time dateTime={day}>{formatDay(day, today)}</time>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={toLocalDate(day)}
            defaultMonth={toLocalDate(day)}
            disabled={{ after: toLocalDate(today) }}
            onSelect={(date) => {
              if (!date) return;
              setOpen(false);
              setDay(fromLocalDate(date));
            }}
          />
        </PopoverContent>
      </Popover>
    </>
  );
}
