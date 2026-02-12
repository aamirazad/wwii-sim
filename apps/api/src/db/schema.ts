import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
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
		.default(sql`(strftime('%s','now'))`)
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
		.default(sql`(strftime('%s','now'))`)
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
		.default(sql`(strftime('%s','now'))`)
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
		.default(sql`(strftime('%s','now'))`)
		.notNull(),
	updatedAt: t
		.integer("updated_at", { mode: "timestamp" })
		.default(sql`(strftime('%s','now'))`)
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
		.default(sql`(strftime('%s','now'))`)
		.notNull(),
});

// Announcements table for moderator messages to countries
export const announcementsTable = t.sqliteTable("announcements", {
	id: t.int().primaryKey({ autoIncrement: true }),
	gameId: t
		.int("game_id")
		.notNull()
		.references(() => gamesTable.id, { onDelete: "cascade" }),
	// The announcement content (supports basic markdown)
	content: t.text("content").notNull(),
	// Target countries as JSON array, null means all countries
	targetCountries: t
		.text("target_countries", { mode: "json" })
		.$type<PlayableCountry[] | null>(),
	// Who created the announcement
	createdBy: t
		.text("created_by")
		.notNull()
		.references(() => usersTable.id, { onDelete: "cascade" }),
	createdAt: t
		.integer("created_at", { mode: "timestamp" })
		.default(sql`(strftime('%s','now'))`)
		.notNull(),
});

// Troop types
export const TROOP_TYPES = [
	"infantry",
	"navalShips",
	"aircraftCarriers",
	"fighters",
	"bombers",
	"spies",
	"submarines",
] as const;
export type TroopType = (typeof TROOP_TYPES)[number];

// Cost per unit for each troop type: { population, oil, steel }
export const TROOP_COSTS: Record<
	TroopType,
	{ population: number; oil: number; steel: number }
> = {
	infantry: { population: 2, oil: 1, steel: 1 },
	navalShips: { population: 1, oil: 2, steel: 3 },
	aircraftCarriers: { population: 2, oil: 4, steel: 4 },
	fighters: { population: 1, oil: 1, steel: 2 },
	bombers: { population: 1, oil: 2, steel: 3 },
	spies: { population: 1, oil: 1, steel: 1 },
	submarines: { population: 1, oil: 3, steel: 2 },
};

// Troop locations table
export const troopLocationTable = t.sqliteTable("troop_location", {
	id: t.int().primaryKey({ autoIncrement: true }),
	countryStateId: t
		.int("country_state_id")
		.notNull()
		.references(() => countryStateTable.id, { onDelete: "cascade" }),
	gameId: t
		.int("game_id")
		.notNull()
		.references(() => gamesTable.id, { onDelete: "cascade" }),
	name: t.text("name").notNull(),
	isHome: t.int("is_home", { mode: "boolean" }).notNull().default(true),
	// Troop counts at this location
	infantry: t.int("infantry").notNull().default(0),
	navalShips: t.int("naval_ships").notNull().default(0),
	aircraftCarriers: t.int("aircraft_carriers").notNull().default(0),
	fighters: t.int("fighters").notNull().default(0),
	bombers: t.int("bombers").notNull().default(0),
	spies: t.int("spies").notNull().default(0),
	submarines: t.int("submarines").notNull().default(0),
	createdAt: t
		.integer("created_at", { mode: "timestamp" })
		.default(sql`(strftime('%s','now'))`)
		.notNull(),
	updatedAt: t
		.integer("updated_at", { mode: "timestamp" })
		.default(sql`(strftime('%s','now'))`)
		.notNull(),
});

// Troop change log for purchase and movement history
export const troopChangeLogTable = t.sqliteTable("troop_change_log", {
	id: t.int().primaryKey({ autoIncrement: true }),
	countryStateId: t
		.int("country_state_id")
		.notNull()
		.references(() => countryStateTable.id, { onDelete: "cascade" }),
	gameId: t
		.int("game_id")
		.notNull()
		.references(() => gamesTable.id, { onDelete: "cascade" }),
	// "purchase", "movement", or "loss"
	actionType: t
		.text("action_type")
		.$type<"purchase" | "movement" | "loss">()
		.notNull(),
	// Deltas per troop type (positive for purchase, positive/negative for movement)
	infantry: t.int("infantry").notNull().default(0),
	navalShips: t.int("naval_ships").notNull().default(0),
	aircraftCarriers: t.int("aircraft_carriers").notNull().default(0),
	fighters: t.int("fighters").notNull().default(0),
	bombers: t.int("bombers").notNull().default(0),
	spies: t.int("spies").notNull().default(0),
	submarines: t.int("submarines").notNull().default(0),
	// For purchases: where troops were placed; for movements: location changes
	details: t.text("details", { mode: "json" }).$type<string>(),
	// Oil spent on movement
	oilCost: t.int("oil_cost").notNull().default(0),
	// Resource cost for purchases
	populationCost: t.int("population_cost").notNull().default(0),
	steelCost: t.int("steel_cost").notNull().default(0),
	changedBy: t.text("changed_by").notNull(),
	createdAt: t
		.integer("created_at", { mode: "timestamp" })
		.default(sql`(strftime('%s','now'))`)
		.notNull(),
});

export const tradeRequestTable = t.sqliteTable("trade_request", {
	id: t.int().primaryKey({ autoIncrement: true }),
	gameId: t
		.int("game_id")
		.notNull()
		.references(() => gamesTable.id, { onDelete: "cascade" }),
	initiatorCountryStateId: t
		.int("initiator_country_state_id")
		.notNull()
		.references(() => countryStateTable.id, { onDelete: "cascade" }),
	recipientCountryStateId: t
		.int("recipient_country_state_id")
		.notNull()
		.references(() => countryStateTable.id, { onDelete: "cascade" }),
	initiatorOil: t.int("initiator_oil").notNull().default(0),
	initiatorSteel: t.int("initiator_steel").notNull().default(0),
	recipientOil: t.int("recipient_oil").notNull().default(0),
	recipientSteel: t.int("recipient_steel").notNull().default(0),
	status: t
		.text("status")
		.$type<"pending" | "accepted" | "rejected">()
		.notNull()
		.default("pending"),
	createdBy: t
		.text("created_by")
		.notNull()
		.references(() => usersTable.id, { onDelete: "cascade" }),
	createdAt: t
		.integer("created_at", { mode: "timestamp" })
		.default(sql`(strftime('%s','now'))`)
		.notNull(),
	updatedAt: t
		.integer("updated_at", { mode: "timestamp" })
		.default(sql`(strftime('%s','now'))`)
		.notNull(),
});

// Year schedules table for persistent year change scheduling
export const yearSchedulesTable = t.sqliteTable("year_schedules", {
	id: t.int().primaryKey({ autoIncrement: true }),
	gameId: t
		.int("game_id")
		.notNull()
		.references(() => gamesTable.id, { onDelete: "cascade" }),
	// The year to change to when triggered
	scheduledYear: t.int("scheduled_year").notNull(),
	// When this year change should occur
	scheduledTime: t.integer("scheduled_time", { mode: "timestamp" }).notNull(),
	// Who created this schedule
	createdBy: t
		.text("created_by")
		.notNull()
		.references(() => usersTable.id, { onDelete: "cascade" }),
	createdAt: t
		.integer("created_at", { mode: "timestamp" })
		.default(sql`(strftime('%s','now'))`)
		.notNull(),
});

export const table = {
	usersTable,
	gamesTable,
	gameStateTable,
	countryStateTable,
	resourceChangeLogTable,
	announcementsTable,
	troopLocationTable,
	troopChangeLogTable,
	tradeRequestTable,
	yearSchedulesTable,
} as const;

export type Table = typeof table;
