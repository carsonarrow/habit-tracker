# Habit Tracker

A personal, single-user tool for ticking off daily habits.

## Language

**Habit**:
Something the user wants to do regularly, tracked as done or not done (no quantities).
_Avoid_: Goal, task, routine

**Day**:
A calendar date in the single configured time zone, starting at midnight. Every Habit is due every Day.
_Avoid_: Period, date range

**Check-in**:
The record that a Habit was done on a given Day; at most one per Habit per Day. Unticking removes it.
_Avoid_: Completion, log, entry

**Start Day**:
The first Day a Habit is tracked; it does not appear on earlier Days. Defaults to the Day it was created but may be set earlier.
_Avoid_: Created date, begin date

**Archived Habit**:
A Habit the user has stopped tracking; hidden from daily use but its Check-ins are kept, and it still shows read-only on Days up to when it was archived. Restoring it makes it active again with no gap. Distinct from deleting, which removes the Habit and its history for good.
_Avoid_: Inactive, paused, disabled
