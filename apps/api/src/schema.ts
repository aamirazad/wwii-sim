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

export const GAME_YEARS = [
	"1938",
	"1939",
	"1940",
	"1941",
	"1942",
	"1943",
	"1944",
] as const;
export type GameYear = (typeof GAME_YEARS)[number];

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

export const CountrySchema = t.Union([
	t.Literal("Commonwealth"),
	t.Literal("France"),
	t.Literal("Germany"),
	t.Literal("Italy"),
	t.Literal("Japan"),
	t.Literal("Russia"),
	t.Literal("UK"),
	t.Literal("USA"),
]);

export const ResourceTypeSchema = t.Union([
	t.Literal("oil"),
	t.Literal("steel"),
	t.Literal("population"),
]);

export const UserSchema = t.Object({
	id: t.String(),
	username: t.String(),
	name: t.String(),
	role: UserRoleSchema,
});

export type User = Static<typeof UserSchema>;

export const YearDurationsSchema = t.Object({
	"1938": t.Number(),
	"1939": t.Number(),
	"1940": t.Number(),
	"1941": t.Number(),
	"1942": t.Number(),
	"1943": t.Number(),
	"1944": t.Number(),
});

export type YearDurations = Static<typeof YearDurationsSchema>;

export const GameSchema = t.Object({
	id: t.Number(),
	status: GameStatusSchema,
	startDate: t.Date(),
	yearDurations: t.Nullable(YearDurationsSchema),
	createdAt: t.Date(),
});

export type Game = Static<typeof GameSchema>;

export const CountryResourcesSchema = t.Object({
	oil: t.Number(),
	steel: t.Number(),
	population: t.Number(),
});

export type CountryResources = Static<typeof CountryResourcesSchema>;

export const CountryConfigSchema = t.Object({
	players: t.Array(t.String()),
	oil: t.Number(),
	steel: t.Number(),
	population: t.Number(),
});

export type CountryConfig = Static<typeof CountryConfigSchema>;

export const CreateGameBodySchema = t.Object({
	startDate: t.String(), // ISO date string
	yearDurations: YearDurationsSchema,
	countries: t.Object({
		Commonwealth: CountryConfigSchema,
		France: CountryConfigSchema,
		Germany: CountryConfigSchema,
		Italy: CountryConfigSchema,
		Japan: CountryConfigSchema,
		Russia: CountryConfigSchema,
		UK: CountryConfigSchema,
		USA: CountryConfigSchema,
	}),
});

export type CreateGameBody = Static<typeof CreateGameBodySchema>;

export const CountryStateSchema = t.Object({
	id: t.Number(),
	name: CountrySchema,
	gameId: t.Number(),
	players: t.Array(t.String()),
	oil: t.Number(),
	steel: t.Number(),
	population: t.Number(),
	createdAt: t.Date(),
	updatedAt: t.Date(),
});

export type CountryState = Static<typeof CountryStateSchema>;

export const ResourceChangeLogSchema = t.Object({
	id: t.Number(),
	countryStateId: t.Number(),
	gameId: t.Number(),
	resourceType: ResourceTypeSchema,
	previousValue: t.Number(),
	newValue: t.Number(),
	note: t.String(),
	changedBy: t.String(),
	createdAt: t.Date(),
});

export type ResourceChangeLog = Static<typeof ResourceChangeLogSchema>;

export const ErrorSchema = t.Object({
	error: t.Literal(true),
	message: t.String(),
});

export type Error = Static<typeof ErrorSchema>;
