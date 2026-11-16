"use client";

import type { Schedule } from "@/core";
import { Checkbox } from "@/components/ui/checkbox";
import { weekdays, type Weekday } from "@/core/day";
import { useState } from "react";

const weekdayLabels: Record<Weekday, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

/**
 * The Schedule field: weekday toggles, or "no fixed days". Choosing no fixed days clears and
 * disables the weekdays (so none are submitted); unchoosing it brings back the last selection.
 */
export function ScheduleField({ schedule }: { schedule: Schedule }) {
  const [noFixedDays, setNoFixedDays] = useState(schedule.kind === "noFixedDays");
  const [selected, setSelected] = useState<readonly Weekday[]>(
    schedule.kind === "weekdays" ? schedule.weekdays : [],
  );

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">Schedule</legend>
      <div className="grid grid-cols-7 gap-1.5">
        {weekdays.map((day) => (
          <label
            key={day}
            className="flex cursor-pointer flex-col items-center gap-1.5 rounded-md border py-2 text-sm has-disabled:cursor-not-allowed has-disabled:opacity-50 has-data-[state=checked]:bg-muted"
          >
            <Checkbox
              name="weekdays"
              value={day}
              disabled={noFixedDays}
              checked={!noFixedDays && selected.includes(day)}
              onCheckedChange={(checked) =>
                setSelected((s) => (checked === true ? [...s, day] : s.filter((d) => d !== day)))
              }
            />
            {weekdayLabels[day]}
          </label>
        ))}
      </div>
      <label className="flex cursor-pointer items-center gap-1.5 self-start rounded-md border px-2 py-2 text-sm has-data-[state=checked]:bg-muted">
        <Checkbox
          name="noFixedDays"
          checked={noFixedDays}
          onCheckedChange={(checked) => setNoFixedDays(checked === true)}
        />
        No fixed days (when it comes up)
      </label>
    </fieldset>
  );
}
