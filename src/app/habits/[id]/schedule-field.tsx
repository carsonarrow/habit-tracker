"use client";

import type { Schedule } from "@/core";
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
      <div className="flex flex-wrap gap-2">
        {weekdays.map((day) => (
          <label
            key={day}
            className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm has-checked:bg-muted has-disabled:opacity-50"
          >
            <input
              type="checkbox"
              name="weekdays"
              value={day}
              disabled={noFixedDays}
              checked={!noFixedDays && selected.includes(day)}
              onChange={(e) =>
                setSelected((s) => (e.target.checked ? [...s, day] : s.filter((d) => d !== day)))
              }
            />
            {weekdayLabels[day]}
          </label>
        ))}
      </div>
      <label className="flex items-center gap-1.5 self-start rounded-md border px-2 py-1 text-sm has-checked:bg-muted">
        <input
          type="checkbox"
          name="noFixedDays"
          checked={noFixedDays}
          onChange={(e) => setNoFixedDays(e.target.checked)}
        />
        No fixed days (when it comes up)
      </label>
    </fieldset>
  );
}
