# Habit Tracker

A personal, single-user tool for ticking off daily habits.

## Language

**Habit**:
Something the user wants to do regularly. On each Day it is Done, Not done, or Unrecorded (no quantities).
_Avoid_: Goal, task, routine

**Day**:
A calendar date in the single configured time zone, starting at midnight. Every Habit is due every Day.
_Avoid_: Period, date range

**Check-in**:
The user's recorded answer for a Habit on a given Day, with an outcome of Done or Not done; at most one per Habit per Day. Clearing it makes the Habit Unrecorded on that Day.
_Avoid_: Completion, log, entry

**Done**:
A Check-in outcome: the user did the Habit that Day.
_Avoid_: Achieved, completed

**Not done**:
A Check-in outcome: the user is saying they did not do the Habit that Day. A deliberate answer, not a gap.
_Avoid_: Missed, skipped, failed, not achieved

**Unrecorded**:
A Habit on a Day it is tracked (from its Start Day, until archived) with no Check-in: the user has not answered. Stays Unrecorded until the user records something; never turns into Not done by itself.
_Avoid_: Blank, missed, pending

**Start Day**:
The first Day a Habit is tracked; it does not appear on earlier Days. Defaults to the Day it was created but may be set earlier.
_Avoid_: Created date, begin date

**Archived Habit**:
A Habit the user has stopped tracking; hidden from daily use but its Check-ins are kept, and it still shows read-only on Days up to when it was archived. Restoring it makes it active again with no gap. Distinct from deleting, which removes the Habit and its history for good.
_Avoid_: Inactive, paused, disabled
