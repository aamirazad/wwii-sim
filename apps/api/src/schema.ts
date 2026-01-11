import { type Static, t } from "elysia";

export const COUNTRIES = [
	"Commonwealth",
	"France",
	"Germany",
	"Italy",
	"Japan",
	"Russia",
	"United Kingdom",
	"United States",
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

export const CountrySchema = t.Union([
	t.Literal("Commonwealth"),
	t.Literal("France"),
	t.Literal("Germany"),
	t.Literal("Italy"),
	t.Literal("Japan"),
	t.Literal("Russia"),
	t.Literal("United Kingdom"),
	t.Literal("United States"),
]);

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
	t.Object({
		type: t.Literal("server.game.started"),
	}),
	t.Object({
		type: t.Literal("server.country.subscribed"),
		country: CountrySchema,
	}),
	t.Object({
		type: t.Literal("server.country.resources"),
		country: CountrySchema,
		resources: t.Object({
			oil: t.Number(),
			steel: t.Number(),
			population: t.Number(),
		}),
	}),
]);

export type ServerMessage = Static<typeof ServerMessageSchema>;

export const ClientMessageSchema = t.Union([
	t.Object({
		type: t.Literal("client.game.start"),
		gameId: t.Number(),
		token: t.String(),
	}),
	t.Object({
		type: t.Literal("client.country.subscribe"),
		token: t.String(),
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
	country: t.Optional(CountrySchema),
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
	oil: t.Number(),
	steel: t.Number(),
	population: t.Number(),
});

export type CountryConfig = Static<typeof CountryConfigSchema>;

export const DEFAULT_COUNTRY_STARTING_RESOURCES: Record<
	Country,
	CountryConfig
> = {
	Commonwealth: { oil: 30, steel: 5, population: 10 },
	France: { oil: 50, steel: 30, population: 20 },
	Germany: { oil: 300, steel: 150, population: 120 },
	Italy: { oil: 50, steel: 60, population: 65 },
	Japan: { oil: 80, steel: 100, population: 100 },
	Russia: { oil: 100, steel: 2, population: 30 },
	"United Kingdom": { oil: 1, steel: 2, population: 3 },
	"United States": { oil: 999999, steel: 0, population: 0 },
};

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
		"United Kingdom": CountryConfigSchema,
		"United States": CountryConfigSchema,
	}),
});

export type CreateGameBody = Static<typeof CreateGameBodySchema>;

export const CountryStateSchema = t.Object({
	id: t.Number(),
	name: CountrySchema,
	gameId: t.Number(),
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
