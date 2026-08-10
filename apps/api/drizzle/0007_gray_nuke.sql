CREATE TABLE `action_request` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`country_state_id` integer NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`payload` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`response` text,
	`created_by` text NOT NULL,
	`resolved_by` text,
	`created_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`country_state_id`) REFERENCES `country_state`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `announcement_replies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`announcement_id` integer NOT NULL,
	`game_id` integer NOT NULL,
	`content` text NOT NULL,
	`created_by` text NOT NULL,
	`author_country` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`announcement_id`) REFERENCES `announcements`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `research_request` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`country_state_id` integer NOT NULL,
	`research_type` text NOT NULL,
	`target_level` integer NOT NULL,
	`steel_cost` integer DEFAULT 0 NOT NULL,
	`population_cost` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`plan` text,
	`moderator_note` text,
	`created_by` text NOT NULL,
	`resolved_by` text,
	`created_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`resolved_at` integer,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`country_state_id`) REFERENCES `country_state`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `research_state` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`country_state_id` integer NOT NULL,
	`research_type` text NOT NULL,
	`level` integer DEFAULT 0 NOT NULL,
	`starting_level` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`country_state_id`) REFERENCES `country_state`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `announcements` ADD `kind` text DEFAULT 'psa' NOT NULL;--> statement-breakpoint
ALTER TABLE `announcements` ADD `author_country` text;--> statement-breakpoint
ALTER TABLE `announcements` ADD `year` integer DEFAULT 1938 NOT NULL;--> statement-breakpoint
ALTER TABLE `country_state` ADD `oil_level` integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `country_state` ADD `steel_level` integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `country_state` ADD `population_level` integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `country_state` ADD `morale` integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `country_state` ADD `tokens` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `country_state` ADD `last_processed_year` integer DEFAULT 1938 NOT NULL;--> statement-breakpoint
ALTER TABLE `trade_request` ADD `initiator_population` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `trade_request` ADD `recipient_population` integer DEFAULT 0 NOT NULL;