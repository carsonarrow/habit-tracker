CREATE TABLE `schedules` (
	`habit_id` integer NOT NULL,
	`effective_day` text NOT NULL,
	`weekdays` text NOT NULL,
	PRIMARY KEY(`habit_id`, `effective_day`),
	FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
-- Every existing Habit starts due every day.
INSERT INTO `schedules` (`habit_id`, `effective_day`, `weekdays`)
SELECT `id`, `start_day`, 'mon,tue,wed,thu,fri,sat,sun' FROM `habits`;
