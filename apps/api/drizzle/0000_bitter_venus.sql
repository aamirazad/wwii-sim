CREATE TABLE `country_state` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`game_id` integer NOT NULL,
	`oil` integer DEFAULT 0 NOT NULL,
	`steel` integer DEFAULT 0 NOT NULL,
	`population` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT '"2026-01-12T03:28:14.548Z"' NOT NULL,
	`updated_at` integer DEFAULT '"2026-01-12T03:28:14.548Z"' NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `game_state` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`current_year` integer DEFAULT 1938 NOT NULL,
	`data` text,
	`updated_at` integer DEFAULT '"2026-01-12T03:28:14.548Z"' NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `games` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`status` text DEFAULT 'waiting',
	`start_date` integer NOT NULL,
	`year_durations` text,
	`created_at` integer DEFAULT '"2026-01-12T03:28:14.548Z"' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `resource_change_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`country_state_id` integer NOT NULL,
	`game_id` integer NOT NULL,
	`resource_type` text NOT NULL,
	`previous_value` integer NOT NULL,
	`new_value` integer NOT NULL,
	`note` text NOT NULL,
	`changed_by` text NOT NULL,
	`created_at` integer DEFAULT '"2026-01-12T03:28:14.548Z"' NOT NULL,
	FOREIGN KEY (`country_state_id`) REFERENCES `country_state`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`country` text,
	`created_at` integer DEFAULT '"2026-01-12T03:28:14.547Z"' NOT NULL
);
