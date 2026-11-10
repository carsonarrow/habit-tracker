# Schedule changes apply forward; past Days keep their Schedule

A Habit's Schedule can change over time, and each change applies from the Day it is made onward; earlier Days are still read under the Schedule that was in effect then. We keep the history of Schedules rather than a single current one so that past Days stay true to what the user was aiming for at the time: a retroactive change would strand old Check-ins on Days the Habit is no longer due and turn old non-due Days into Unrecorded ones.

## Consequences

- The earliest Schedule also covers any Days between a backdated Start Day and when that Schedule was set.
- A change made today is rejected if it would make the Habit not due today while it already has a Check-in today, matching the Start Day rule that history is never hidden.
- Schedule history is not shown or editable; only the current Schedule is.
