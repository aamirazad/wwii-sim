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
		counter: t.Number(),
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
		type: t.Literal("server.country_state"),
		country: t.String(),
		resources: t.Object({
			oil: t.Number(),
			steel: t.Number(),
			population: t.Number(),
		}),
	}),
	t.Object({
		type: t.Literal("server.resource_updated"),
		country: t.String(),
		resource: t.String(),
		value: t.Number(),
	}),
]);

export type ServerMessage = Static<typeof ServerMessageSchema>;

export const ClientMessageSchema = t.Union([
	t.Object({
		type: t.Literal("client.counter.increment"),
	}),
	t.Object({
		type: t.Literal("client.game.set_time_offset"),
		seconds: t.Number(),
	}),
	t.Object({
		type: t.Literal("client.game.set_countries"),
		countries: t.Array(t.String()),
	}),
	t.Object({
		type: t.Literal("client.join_country"),
		country: t.String(),
		username: t.String(),
	}),
	t.Object({
		type: t.Literal("client.update_resource"),
		country: t.String(),
		resource: t.String(),
		value: t.Number(),
	}),
]);

export type ClientMessage = Static<typeof ClientMessageSchema>;
