PRAGMA foreign_keys=OFF;--> statement-breakpoint
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
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_resource_change_log`("id", "country_state_id", "game_id", "resource_type", "previous_value", "new_value", "note", "changed_by", "created_at") SELECT "id", "country_state_id", "game_id", "resource_type", "previous_value", "new_value", "note", "changed_by", "created_at" FROM `resource_change_log`;--> statement-breakpoint
DROP TABLE `resource_change_log`;--> statement-breakpoint
ALTER TABLE `__new_resource_change_log` RENAME TO `resource_change_log`;--> statement-breakpoint
PRAGMA foreign_keys=ON;