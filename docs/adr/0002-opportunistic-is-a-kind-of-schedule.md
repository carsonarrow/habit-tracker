# "No fixed days" is a kind of Schedule, not a property of the Habit

An Opportunistic Habit is a Habit whose Schedule is "no fixed days", one of a Schedule's two kinds alongside a set of weekdays. It is not a separate flag set on the Habit or a separate concept next to Habits. Making it a Schedule means a Habit can switch between scheduled and opportunistic at any time, and the switch comes under ADR 0001 for free: it applies from that Day forward, past Days keep the Schedule they had, and today's Check-in is protected. A fixed property would have been simpler to read but would force the user to delete and recreate a Habit (losing its history) to change how it is tracked.

## Consequences

- "No fixed days" is an explicit choice. An empty weekday list is still rejected, so unticking every weekday by accident is an error, not a silent switch to opportunistic.
- An Opportunistic Habit is never *due*; it can be *recorded* on any Day from its Start Day until archived. Rules that used to say "due" now say "can be recorded on".
- Archived Habits are asymmetric on past Days. A scheduled one shows read-only on every Day it was due, because an Unrecorded due Day is a meaningful gap. An opportunistic one shows only on Days it has a Check-in, because an empty Day tells you nothing.
