import { type Static, t } from "elysia";

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
]);

export type ClientMessage = Static<typeof ClientMessageSchema>;
