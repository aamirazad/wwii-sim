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
		type: t.Literal("server.authError"),
		message: t.String(),
	}),
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
