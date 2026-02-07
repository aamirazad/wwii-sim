PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_announcements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`content` text NOT NULL,
	`target_countries` text,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_announcements`("id", "game_id", "content", "target_countries", "created_by", "created_at") SELECT "id", "game_id", "content", "target_countries", "created_by", "created_at" FROM `announcements`;--> statement-breakpoint
DROP TABLE `announcements`;--> statement-breakpoint
ALTER TABLE `__new_announcements` RENAME TO `announcements`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_country_state` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`game_id` integer NOT NULL,
	`oil` integer DEFAULT 0 NOT NULL,
	`steel` integer DEFAULT 0 NOT NULL,
	`population` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_country_state`("id", "name", "game_id", "oil", "steel", "population", "created_at", "updated_at") SELECT "id", "name", "game_id", "oil", "steel", "population", "created_at", "updated_at" FROM `country_state`;--> statement-breakpoint
DROP TABLE `country_state`;--> statement-breakpoint
ALTER TABLE `__new_country_state` RENAME TO `country_state`;--> statement-breakpoint
CREATE TABLE `__new_game_state` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`current_year` integer DEFAULT 1938 NOT NULL,
	`data` text,
	`updated_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_game_state`("id", "game_id", "current_year", "data", "updated_at") SELECT "id", "game_id", "current_year", "data", "updated_at" FROM `game_state`;--> statement-breakpoint
DROP TABLE `game_state`;--> statement-breakpoint
ALTER TABLE `__new_game_state` RENAME TO `game_state`;--> statement-breakpoint
CREATE TABLE `__new_games` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`status` text DEFAULT 'waiting',
	`start_date` integer NOT NULL,
	`year_durations` text,
	`created_at` integer DEFAULT (strftime('%s','now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_games`("id", "status", "start_date", "year_durations", "created_at") SELECT "id", "status", "start_date", "year_durations", "created_at" FROM `games`;--> statement-breakpoint
DROP TABLE `games`;--> statement-breakpoint
ALTER TABLE `__new_games` RENAME TO `games`;--> statement-breakpoint
CREATE TABLE `__new_resource_change_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`country_state_id` integer NOT NULL,
	`game_id` integer NOT NULL,
	`resource_type` text NOT NULL,
	`previous_value` integer NOT NULL,
	`new_value` integer NOT NULL,
	`note` text NOT NULL,
	`changed_by` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`country_state_id`) REFERENCES `country_state`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_resource_change_log`("id", "country_state_id", "game_id", "resource_type", "previous_value", "new_value", "note", "changed_by", "created_at") SELECT "id", "country_state_id", "game_id", "resource_type", "previous_value", "new_value", "note", "changed_by", "created_at" FROM `resource_change_log`;--> statement-breakpoint
DROP TABLE `resource_change_log`;--> statement-breakpoint
ALTER TABLE `__new_resource_change_log` RENAME TO `resource_change_log`;--> statement-breakpoint
CREATE TABLE `__new_troop_change_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`country_state_id` integer NOT NULL,
	`game_id` integer NOT NULL,
	`action_type` text NOT NULL,
	`infantry` integer DEFAULT 0 NOT NULL,
	`naval_ships` integer DEFAULT 0 NOT NULL,
	`aircraft_carriers` integer DEFAULT 0 NOT NULL,
	`fighters` integer DEFAULT 0 NOT NULL,
	`bombers` integer DEFAULT 0 NOT NULL,
	`spies` integer DEFAULT 0 NOT NULL,
	`submarines` integer DEFAULT 0 NOT NULL,
	`details` text,
	`oil_cost` integer DEFAULT 0 NOT NULL,
	`population_cost` integer DEFAULT 0 NOT NULL,
	`steel_cost` integer DEFAULT 0 NOT NULL,
	`changed_by` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`country_state_id`) REFERENCES `country_state`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_troop_change_log`("id", "country_state_id", "game_id", "action_type", "infantry", "naval_ships", "aircraft_carriers", "fighters", "bombers", "spies", "submarines", "details", "oil_cost", "population_cost", "steel_cost", "changed_by", "created_at") SELECT "id", "country_state_id", "game_id", "action_type", "infantry", "naval_ships", "aircraft_carriers", "fighters", "bombers", "spies", "submarines", "details", "oil_cost", "population_cost", "steel_cost", "changed_by", "created_at" FROM `troop_change_log`;--> statement-breakpoint
DROP TABLE `troop_change_log`;--> statement-breakpoint
ALTER TABLE `__new_troop_change_log` RENAME TO `troop_change_log`;--> statement-breakpoint
CREATE TABLE `__new_troop_location` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`country_state_id` integer NOT NULL,
	`game_id` integer NOT NULL,
	`name` text NOT NULL,
	`is_home` integer DEFAULT true NOT NULL,
	`infantry` integer DEFAULT 0 NOT NULL,
	`naval_ships` integer DEFAULT 0 NOT NULL,
	`aircraft_carriers` integer DEFAULT 0 NOT NULL,
	`fighters` integer DEFAULT 0 NOT NULL,
	`bombers` integer DEFAULT 0 NOT NULL,
	`spies` integer DEFAULT 0 NOT NULL,
	`submarines` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`country_state_id`) REFERENCES `country_state`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_troop_location`("id", "country_state_id", "game_id", "name", "is_home", "infantry", "naval_ships", "aircraft_carriers", "fighters", "bombers", "spies", "submarines", "created_at", "updated_at") SELECT "id", "country_state_id", "game_id", "name", "is_home", "infantry", "naval_ships", "aircraft_carriers", "fighters", "bombers", "spies", "submarines", "created_at", "updated_at" FROM `troop_location`;--> statement-breakpoint
DROP TABLE `troop_location`;--> statement-breakpoint
ALTER TABLE `__new_troop_location` RENAME TO `troop_location`;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`country` text,
	`created_at` integer DEFAULT (strftime('%s','now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "username", "name", "email", "role", "country", "created_at") SELECT "id", "username", "name", "email", "role", "country", "created_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE TABLE `__new_year_schedules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`scheduled_year` integer NOT NULL,
	`scheduled_time` integer NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_year_schedules`("id", "game_id", "scheduled_year", "scheduled_time", "created_by", "created_at") SELECT "id", "game_id", "scheduled_year", "scheduled_time", "created_by", "created_at" FROM `year_schedules`;--> statement-breakpoint
DROP TABLE `year_schedules`;--> statement-breakpoint
ALTER TABLE `__new_year_schedules` RENAME TO `year_schedules`;