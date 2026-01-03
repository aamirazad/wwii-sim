import { type Static, t } from "elysia";

export const COUNTRIES = [
	"Commonwealth",
	"France",
	"Germany",
	"Italy",
	"Japan",
	"Russia",
	"UK",
	"USA",
] as const;
export type Country = (typeof COUNTRIES)[number];

export const RESOURCES = ["oil", "steel", "population"] as const;
export type Resource = (typeof RESOURCES)[number];

export const ServerMessageSchema = t.Union([
	t.Object({
		type: t.Literal("server.connected"),
		apiVersion: t.String(),
	}),
	t.Object({
		type: t.Literal("server.announce"),
		announcement: t.String(),
	}),
	t.Object({
		type: t.Literal("server.counter"),
		counter: t.Number(),
	}),
	t.Object({
		type: t.Literal("server.error"),
		message: t.String(),
	}),
	t.Object({
		type: t.Literal("server.user"),
		user: t.Object({
			id: t.String(),
			username: t.String(),
			name: t.String(),
			email: t.String(),
			role: t.String(),
			createdAt: t.Date(),
		}),
	}),
]);

export type ServerMessage = Static<typeof ServerMessageSchema>;

export const ClientMessageSchema = t.Union([
	t.Object({
		token: t.String(),
		type: t.Literal("client.counter.increment"),
	}),
	t.Object({
		token: t.String(),
		type: t.Literal("client.auth"),
		userId: t.String(),
	}),
]);

export type ClientMessage = Static<typeof ClientMessageSchema>;

// API

export const UserRoleSchema = t.Union([
	t.Literal("admin"),
	t.Literal("player"),
	t.Literal("spectator"),
]);

export type UserRole = Static<typeof UserRoleSchema>;

export const GameStatusSchema = t.Union([
	t.Literal("waiting"),
	t.Literal("active"),
	t.Literal("paused"),
	t.Literal("finished"),
]);

export type GameStatus = Static<typeof GameStatusSchema>;

export const UserSchema = t.Object({
	id: t.String(),
	username: t.String(),
	name: t.String(),
	role: UserRoleSchema,
	createdAt: t.Date(),
});

export type User = Static<typeof UserSchema>;

export const GameSchema = t.Object({
	id: t.Number(),
	status: GameStatusSchema,
	startTime: t.Nullable(t.Date()),
	createdAt: t.Date(),
});

export type Game = Static<typeof GameSchema>;

export const ErrorSchema = t.Object({
	error: t.Literal(true),
	message: t.String(),
});

export type Error = Static<typeof ErrorSchema>;
