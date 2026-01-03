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

export const usersTable = t.sqliteTable("users", {
	id: t
		.text("id")
		.$defaultFn(() => createId())
		.primaryKey(),
	username: t.text("username").notNull(),
	name: t.text("name").notNull(),
	email: t.text("email").notNull(),
	role: t.text("role").$type<UserRole>().notNull(),
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
	startTime: t.integer("start_time", { mode: "timestamp" }),
	createdAt: t
		.integer("created_at", { mode: "timestamp" })
		.default(new Date())
		.notNull(),
});

export const gameStateTable = t.sqliteTable("game_state", {
	id: t.int().primaryKey({ autoIncrement: true }),
	gameId: t
		.text("game_id")
		.notNull()
		.references(() => gamesTable.id),
	data: t.text("data", { mode: "json" }),
	updatedAt: t
		.integer("updated_at", { mode: "timestamp" })
		.default(new Date())
		.notNull(),
});

export const countryStateTable = t.sqliteTable("country_state", {
	id: t.int().primaryKey({ autoIncrement: true }),
	name: t.text("name").notNull(),
	gameId: t
		.text("game_id")
		.notNull()
		.references(() => gamesTable.id),
});

export const table = {
	usersTable,
	gamesTable,
	gameStateTable,
} as const;

export type Table = typeof table;
