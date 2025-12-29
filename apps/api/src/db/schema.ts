import { createId } from "@paralleldrive/cuid2";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("user", {
	id: text("id")
		.$defaultFn(() => createId())
		.primaryKey(),
	username: text("username").notNull(),
	name: text("name").notNull(),
	email: text("email").notNull(),
	role: text("role").notNull(),
	createdAt: integer("created_at", { mode: "timestamp" })
		.default(new Date())
		.notNull(),
});

export const gameStateTable = sqliteTable("game_state", {
	id: text("id")
		.$defaultFn(() => createId())
		.primaryKey(),
	counter: integer("counter").default(0).notNull(),
});

export const table = {
	usersTable,
	gameStateTable,
} as const;

export type Table = typeof table;
