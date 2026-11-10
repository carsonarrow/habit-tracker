CREATE TABLE `check_ins` (
	`habit_id` integer NOT NULL,
	`day` text NOT NULL,
	PRIMARY KEY(`habit_id`, `day`),
	FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON UPDATE no action ON DELETE cascade
);
