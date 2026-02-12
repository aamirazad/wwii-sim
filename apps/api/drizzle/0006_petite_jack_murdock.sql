CREATE TABLE `trade_request` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`initiator_country_state_id` integer NOT NULL,
	`recipient_country_state_id` integer NOT NULL,
	`initiator_oil` integer DEFAULT 0 NOT NULL,
	`initiator_steel` integer DEFAULT 0 NOT NULL,
	`recipient_oil` integer DEFAULT 0 NOT NULL,
	`recipient_steel` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`initiator_country_state_id`) REFERENCES `country_state`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipient_country_state_id`) REFERENCES `country_state`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
