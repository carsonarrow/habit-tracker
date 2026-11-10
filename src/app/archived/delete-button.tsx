"use client";

import { Button } from "@/components/ui/button";
import { deleteHabit } from "../actions";

/** Delete button that asks for confirmation before permanently removing the Habit. */
export function DeleteButton({ habitId, name }: { habitId: number; name: string }) {
  return (
    <form
      action={deleteHabit.bind(null, habitId)}
      onSubmit={(e) => {
        if (!window.confirm(`Delete "${name}" and all its Check-ins? This cannot be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="destructive" size="sm">
        Delete
      </Button>
    </form>
  );
}
