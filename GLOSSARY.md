# Habit Tracker

A personal, single-user tool for ticking off daily habits.

## Language

**Habit**:
Something the user wants to do regularly: on the Days its Schedule makes it due, or, for an Opportunistic Habit, whenever the opportunity arises. On each Day it can be recorded on, it is Done, Not done, or Unrecorded (no quantities).
_Avoid_: Goal, task, routine

**Opportunistic Habit**:
A Habit whose Schedule has no fixed Days: it only comes into play when the opportunity arises (e.g. taking the stairs when there's a choice). It is never due, but can be recorded on any Day. Done means the user took the opportunity that Day; Not done means an opportunity came and they let it pass. Still at most one Check-in per Day, however many opportunities came up.
_Avoid_: Unscheduled habit, ad hoc habit, optional habit

**Day**:
A calendar date in the single configured time zone, starting at midnight. Which Days a Habit is due on is set by its Schedule.
_Avoid_: Period, date range

**Schedule**:
When a Habit is due: either some days of the week (e.g. Mon/Wed/Fri; every day of the week by default), or no fixed Days, which makes it an Opportunistic Habit. A Habit with fixed days can be recorded only on the Days it is due; on other Days it does not appear and nothing can be recorded. Changing a Schedule applies from that Day forward; earlier Days keep the Schedule they had.
_Avoid_: Frequency, recurrence, cadence, repeat

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
A Habit on a Day it can be recorded on (from its Start Day, until archived) with no Check-in: the user has not answered. For an Opportunistic Habit this simply means nothing was recorded, not that an answer is expected. Stays Unrecorded until the user records something; never turns into Not done by itself.
_Avoid_: Blank, missed, pending

**Start Day**:
The first Day a Habit is tracked; it does not appear on earlier Days, and first appears on the first Day from then on that it can be recorded on. Defaults to the Day it was created but may be set earlier.
_Avoid_: Created date, begin date

**Archived Habit**:
A Habit the user has stopped tracking; hidden from daily use but its Check-ins are kept, and it still shows read-only on the Days it was due up to when it was archived (for an Opportunistic Habit, only the Days it has a Check-in). Restoring it makes it active again with no gap. Distinct from deleting, which removes the Habit and its history for good.
_Avoid_: Inactive, paused, disabled
