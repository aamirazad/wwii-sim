import { createId } from "@paralleldrive/cuid2";
import * as t from "drizzle-orm/sqlite-core";

// Shared type constants
export const USER_ROLES = ["admin", "player", "spectator"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const GAME_STATUSES = [
	"waiting",
	"active",
	"paused",
	"finished",
] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

export const COUNTRIES = [
	"Commonwealth",
	"France",
	"Germany",
	"Italy",
	"Japan",
	"Russia",
	"United Kingdom",
	"United States",
	"Mods",
] as const;
export type Country = (typeof COUNTRIES)[number];

// Countries that participate in gameplay (excludes "Mods")
export const PLAYABLE_COUNTRIES = [
	"Commonwealth",
	"France",
	"Germany",
	"Italy",
	"Japan",
	"Russia",
	"United Kingdom",
	"United States",
] as const;
export type PlayableCountry = (typeof PLAYABLE_COUNTRIES)[number];

export const usersTable = t.sqliteTable("users", {
	id: t
		.text("id")
		.$defaultFn(() => createId())
		.primaryKey(),
	username: t.text("username").notNull(),
	name: t.text("name").notNull(),
	email: t.text("email").notNull(),
	role: t.text("role").$type<UserRole>().notNull(),
	country: t.text("country").$type<Country>(),
	createdAt: t
		.integer("created_at", { mode: "timestamp" })
		.default(new Date())
		.notNull(),
});

export const gamesTable = t.sqliteTable("games", {
	id: t.int().primaryKey({ autoIncrement: true }),
	status: t
		.text("status")
		.$type<"waiting" | "active" | "paused" | "finished">()
		.default("waiting"),
	startDate: t.integer("start_date", { mode: "timestamp" }).notNull(),
	// Year durations stored as JSON: { "1938": minutes, "1939": minutes, ... }
	yearDurations: t
		.text("year_durations", { mode: "json" })
		.$type<Record<string, number>>(),
	createdAt: t
		.integer("created_at", { mode: "timestamp" })
		.default(new Date())
		.notNull(),
});

export const gameStateTable = t.sqliteTable("game_state", {
	id: t.int().primaryKey({ autoIncrement: true }),
	gameId: t
		.int("game_id")
		.notNull()
		.references(() => gamesTable.id, { onDelete: "cascade" }),
	currentYear: t.int("current_year").notNull().default(1938),
	data: t.text("data", { mode: "json" }),
	updatedAt: t
		.integer("updated_at", { mode: "timestamp" })
		.default(new Date())
		.notNull(),
});

export const countryStateTable = t.sqliteTable("country_state", {
	id: t.int().primaryKey({ autoIncrement: true }),
	name: t.text("name").$type<Country>().notNull(),
	gameId: t
		.int("game_id")
		.notNull()
		.references(() => gamesTable.id, { onDelete: "cascade" }),
	// Resources
	oil: t.int("oil").default(0).notNull(),
	steel: t.int("steel").default(0).notNull(),
	population: t.int("population").default(0).notNull(),
	createdAt: t
		.integer("created_at", { mode: "timestamp" })
		.default(new Date())
		.notNull(),
	updatedAt: t
		.integer("updated_at", { mode: "timestamp" })
		.default(new Date())
		.notNull(),
});

// Resource change log for revision history
export const resourceChangeLogTable = t.sqliteTable("resource_change_log", {
	id: t.int().primaryKey({ autoIncrement: true }),
	countryStateId: t
		.int("country_state_id")
		.notNull()
		.references(() => countryStateTable.id, { onDelete: "cascade" }),
	gameId: t
		.int("game_id")
		.notNull()
		.references(() => gamesTable.id, { onDelete: "cascade" }),
	// Which resource changed
	resourceType: t
		.text("resource_type")
		.$type<"oil" | "steel" | "population">()
		.notNull(),
	// Change values
	previousValue: t.int("previous_value").notNull(),
	newValue: t.int("new_value").notNull(),
	// Note describing why the change was made
	note: t.text("note").notNull(),
	// Who made the change
	changedBy: t
		.text("changed_by")
		.notNull()
		.references(() => usersTable.id, { onDelete: "cascade" }),
	createdAt: t
		.integer("created_at", { mode: "timestamp" })
		.default(new Date())
		.notNull(),
});

export const table = {
	usersTable,
	gamesTable,
	gameStateTable,
	countryStateTable,
	resourceChangeLogTable,
} as const;

export type Table = typeof table;
