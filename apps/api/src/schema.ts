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
	t.Literal("Mods"),
	t.Null(),
]);

export const PlayableCountrySchema = t.Union([
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
	t.Object({
		type: t.Literal("server.year.changed"),
		year: t.Number(),
	}),
	t.Object({
		type: t.Literal("server.game.ended"),
	}),
	t.Object({
		type: t.Literal("server.game.paused"),
	}),
	t.Object({
		type: t.Literal("server.game.unpaused"),
	}),
	t.Object({
		type: t.Literal("server.announcement"),
		announcement: t.Object({
			id: t.Number(),
			content: t.String(),
			targetCountries: t.Nullable(t.Array(PlayableCountrySchema)),
			createdBy: t.String(),
			createdAt: t.Date(),
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

export const TradeResourceTypeSchema = t.Union([
	t.Literal("oil"),
	t.Literal("steel"),
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

export const ExtendedGameSchema = t.Object({
	id: t.Number(),
	status: GameStatusSchema,
	startDate: t.Date(),
	yearDurations: t.Nullable(YearDurationsSchema),
	currentYear: t.Number(),
	createdAt: t.Date(),
});

export type ExtendedGame = Static<typeof ExtendedGameSchema>;

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
	PlayableCountry,
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

export const TradeResourcesSchema = t.Object({
	oil: t.Number(),
	steel: t.Number(),
});

export type TradeResources = Static<typeof TradeResourcesSchema>;

export const TradeRequestStatusSchema = t.Union([
	t.Literal("pending"),
	t.Literal("accepted"),
	t.Literal("rejected"),
]);

export const TradeRequestSchema = t.Object({
	id: t.Number(),
	gameId: t.Number(),
	initiatorCountryStateId: t.Number(),
	recipientCountryStateId: t.Number(),
	initiatorCountryName: CountrySchema,
	recipientCountryName: CountrySchema,
	initiatorResources: TradeResourcesSchema,
	recipientResources: TradeResourcesSchema,
	totalResources: t.Number(),
	oilCost: t.Number(),
	steelRequirement: t.Number(),
	status: TradeRequestStatusSchema,
	createdBy: t.String(),
	createdAt: t.Date(),
	updatedAt: t.Date(),
});

export type TradeRequest = Static<typeof TradeRequestSchema>;

export const AnnouncementSchema = t.Object({
	id: t.Number(),
	gameId: t.Number(),
	content: t.String(),
	targetCountries: t.Nullable(t.Array(PlayableCountrySchema)),
	createdBy: t.String(),
	createdAt: t.Date(),
});

export type Announcement = Static<typeof AnnouncementSchema>;

export const ErrorSchema = t.Object({
	error: t.Literal(true),
	message: t.String(),
});

export type Error = Static<typeof ErrorSchema>;

// Year schedule schema for API responses
export const YearScheduleSchema = t.Object({
	id: t.Number(),
	gameId: t.Number(),
	scheduledYear: t.Number(),
	scheduledTime: t.Date(),
	createdBy: t.String(),
	createdAt: t.Date(),
});

export type YearSchedule = Static<typeof YearScheduleSchema>;

export const CreateYearScheduleBodySchema = t.Object({
	scheduledYear: t.Number(),
	scheduledTime: t.String(), // ISO date string
});

export type CreateYearScheduleBody = Static<
	typeof CreateYearScheduleBodySchema
>;

export const UpdateYearScheduleBodySchema = t.Object({
	scheduledYear: t.Optional(t.Number()),
	scheduledTime: t.Optional(t.String()), // ISO date string
});

export type UpdateYearScheduleBody = Static<
	typeof UpdateYearScheduleBodySchema
>;

// Troop types and costs

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

export const TROOP_LABELS: Record<TroopType, string> = {
	infantry: "Infantry",
	navalShips: "Naval Ships",
	aircraftCarriers: "Aircraft Carriers",
	fighters: "Fighters",
	bombers: "Bombers",
	spies: "Spies",
	submarines: "Submarines",
};

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

export const TroopCountsSchema = t.Object({
	infantry: t.Number(),
	navalShips: t.Number(),
	aircraftCarriers: t.Number(),
	fighters: t.Number(),
	bombers: t.Number(),
	spies: t.Number(),
	submarines: t.Number(),
});

export type TroopCounts = Static<typeof TroopCountsSchema>;

export const ZERO_TROOPS: TroopCounts = {
	infantry: 0,
	navalShips: 0,
	aircraftCarriers: 0,
	fighters: 0,
	bombers: 0,
	spies: 0,
	submarines: 0,
};

export const TroopLocationSchema = t.Object({
	id: t.Number(),
	countryStateId: t.Number(),
	gameId: t.Number(),
	name: t.String(),
	isHome: t.Boolean(),
	infantry: t.Number(),
	navalShips: t.Number(),
	aircraftCarriers: t.Number(),
	fighters: t.Number(),
	bombers: t.Number(),
	spies: t.Number(),
	submarines: t.Number(),
	createdAt: t.Date(),
	updatedAt: t.Date(),
});

export type TroopLocation = Static<typeof TroopLocationSchema>;

export const TroopChangeLogSchema = t.Object({
	id: t.Number(),
	countryStateId: t.Number(),
	gameId: t.Number(),
	actionType: t.Union([
		t.Literal("purchase"),
		t.Literal("movement"),
		t.Literal("loss"),
	]),
	infantry: t.Number(),
	navalShips: t.Number(),
	aircraftCarriers: t.Number(),
	fighters: t.Number(),
	bombers: t.Number(),
	spies: t.Number(),
	submarines: t.Number(),
	details: t.Nullable(t.String()),
	oilCost: t.Number(),
	populationCost: t.Number(),
	steelCost: t.Number(),
	changedBy: t.String(),
	createdAt: t.Date(),
});

export type TroopChangeLog = Static<typeof TroopChangeLogSchema>;
