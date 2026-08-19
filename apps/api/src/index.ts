import { randomInt } from "node:crypto";
import { cors } from "@elysiajs/cors";
import { node } from "@elysiajs/node";
import { fromTypes, openapi } from "@elysiajs/openapi";
import { and, eq, or, sql } from "drizzle-orm";
import { Elysia, t } from "elysia";
import packageJson from "../package.json";
import { db } from "./db";
import {
	actionRequestTable,
	announcementRepliesTable,
	announcementsTable,
	type Country,
	countryStateTable,
	type GameStatus,
	gameStateTable,
	gamesTable,
	PLAYABLE_COUNTRIES,
	type PlayableCountry,
	researchRequestTable,
	researchStateTable,
	resourceChangeLogTable,
	tradeRequestTable,
	troopChangeLogTable,
	troopLocationTable,
	type UserRole,
	usersTable,
} from "./db/schema";
import {
	COUNTRY_RULES,
	RESEARCH_RULES,
	RESEARCH_TYPES,
	type ResearchType,
} from "./game-rules";
import {
	ActionRequestStatusSchema,
	ActionRequestTypeSchema,
	AnnouncementReplySchema,
	AnnouncementSchema,
	ClientMessageSchema,
	CountrySchema,
	CountryStateSchema,
	CreateGameBodySchema,
	ErrorSchema,
	ExtendedGameSchema,
	GameSchema,
	PlayableCountrySchema,
	ResearchTypeSchema,
	ResourceChangeLogSchema,
	ServerMessageSchema,
	TROOP_COSTS,
	TROOP_TYPES,
	TradeRequestSchema,
	TradeResourcesSchema,
	TroopChangeLogSchema,
	TroopCountsSchema,
	TroopLocationSchema,
	UserRoleSchema,
	UserSchema,
	type YearDurations,
} from "./schema";
import {
	cacheUser,
	getCachedUser,
	invalidateCachedUser,
} from "./services/auth-cache";
import { EmailConfigurationError, sendGameLoginEmails } from "./services/email";
import { yearScheduler } from "./services/year-scheduler";

const calculateTradeCosts = (resources: {
	initiatorOil: number;
	initiatorSteel: number;
	initiatorPopulation: number;
	recipientOil: number;
	recipientSteel: number;
	recipientPopulation: number;
}) => {
	const totalResources =
		resources.initiatorOil +
		resources.initiatorSteel +
		resources.initiatorPopulation +
		resources.recipientOil +
		resources.recipientSteel +
		resources.recipientPopulation;
	const oilCost = Math.ceil(totalResources / 4);
	return {
		totalResources,
		oilCost,
		steelRequirement: oilCost,
	};
};

const configuredOrigins = (process.env.CORS_ORIGIN || "")
	.split(",")
	.map((origin) => origin.trim())
	.filter(Boolean);

const app = new Elysia({ adapter: node() })
	.use(
		openapi({
			references: fromTypes(),
			documentation: {
				info: {
					title: "WWII Simulation API Docs",
					version: packageJson.version,
				},
			},
		}),
	)
	.use(
		cors({
			origin: [
				/^(?:https?:\/\/)?(?:sim\.aamirazad\.com|[A-Za-z0-9-]+-aamira\.vercel\.app|localhost:3000)(?:\/.*)?$/,
				...configuredOrigins,
			],
			maxAge: 86400,
		}),
	)
	.get("/", () => "WWII Sim API", {
		detail: {
			summary: "Root Endpoint",
			description: "Returns a string indicating that this the API route",
			tags: ["Utility"],
		},
	})
	.get("/ping", () => "Pong", {
		detail: {
			summary: "Health Check",
			description: "Returns 'Pong' to verify the server is alive.",
			tags: ["Utility"],
		},
	})
	// Public user lookup endpoint for authentication
	.get(
		"/user/:id",
		async ({ params, set }) => {
			const user = await getCachedUser(params.id);

			if (!user) {
				set.status = 404;
				return { error: true as const, message: "User not found" };
			}

			const baseUser = {
				id: user.id,
				username: user.username,
				name: user.name,
				role: user.role as UserRole,
			};

			const userResponse =
				user.country != null
					? { ...baseUser, country: user.country as Country }
					: baseUser;

			return {
				error: false as const,
				user: userResponse,
			};
		},
		{
			response: t.Union([
				t.Object({
					error: t.Literal(false),
					user: UserSchema,
				}),
				ErrorSchema,
			]),
			params: t.Object({
				id: t.String(),
			}),
			detail: {
				summary: "Get User by ID",
				description: "Returns user information including their role.",
				tags: ["User"],
			},
		},
	)
	// Websocket
	.ws("/ws", {
		// The Node adapter only runs Elysia's built-in WebSocket JSON parser when
		// a parse hook is present. Without this, every JSON client message reaches
		// schema validation as a string and is rejected before `message` runs.
		parse: () => undefined,
		body: ClientMessageSchema,
		response: ServerMessageSchema,
		open(ws) {
			ws.send({
				type: "server.connected",
				apiVersion: packageJson.version,
			});
			ws.subscribe("global");
		},
		async message(ws, message) {
			const authenticatedUser = await getCachedUser(message.token);

			if (!authenticatedUser) {
				ws.send({
					type: "server.error",
					message: "Missing or invalid Authorization header",
				});
				return;
			}

			switch (message.type) {
				case "client.game.start":
					await db
						.update(gamesTable)
						.set({ status: "active" })
						.where(eq(gamesTable.id, message.gameId));

					// Schedule year changes for the game
					await yearScheduler.scheduleGameYears(message.gameId);

					ws.send({
						type: "server.game.started",
					});
					ws.publish("global", {
						type: "server.game.started",
					});
					break;

				case "client.country.subscribe": {
					const userCountry = authenticatedUser.country as Country | null;
					if (!userCountry) {
						ws.send({
							type: "server.error",
							message: "User is not assigned to a country",
						});
						return;
					}

					// Subscribe to country-specific room
					ws.subscribe(`country:${userCountry}`);

					// Get current country resources from the active game
					const [game] = await db
						.select()
						.from(gamesTable)
						.where(
							or(
								eq(gamesTable.status, "active"),
								eq(gamesTable.status, "waiting"),
								eq(gamesTable.status, "paused"),
							),
						)
						.limit(1);

					if (game) {
						const [countryState] = await db
							.select()
							.from(countryStateTable)
							.where(
								and(
									eq(countryStateTable.gameId, game.id),
									eq(countryStateTable.name, userCountry),
								),
							);

						if (countryState) {
							ws.send({
								type: "server.country.resources",
								country: userCountry,
								resources: {
									oil: countryState.oil,
									steel: countryState.steel,
									population: countryState.population,
								},
							});
						}
					}

					ws.send({
						type: "server.country.subscribed",
						country: userCountry,
					});
					break;
				}
			}
		},
		close(ws) {
			ws.unsubscribe("global");
		},
	})
	// Protected routes
	.guard({
		query: t.Object({
			authorization: t.String(),
		}),
	})
	.onBeforeHandle(async ({ query, set }) => {
		const authHeader = query.authorization;

		if (!authHeader) {
			set.status = 401;
			return { error: true, message: "Missing authorization header" };
		}

		const user = await getCachedUser(authHeader);

		if (!user) {
			set.status = 401;
			return { error: true, message: "Invalid authorization header" };
		}
	})
	.get(
		"/users",
		async () => {
			const users = await db.select().from(usersTable);
			return users.map((user) => {
				const base = {
					id: user.id,
					username: user.username,
					name: user.name,
					email: user.email,
					role: user.role as UserRole,
					createdAt: user.createdAt,
				};

				return user.country != null
					? { ...base, country: user.country as Country }
					: base;
			});
		},
		{
			response: t.Array(UserSchema),
			detail: {
				summary: "List Users",
				description: "Returns all users.",
				tags: ["User"],
			},
		},
	)
	.get(
		"/game/current",
		async () => {
			const [game] = await db
				.select()
				.from(gamesTable)
				.where(
					or(
						eq(gamesTable.status, "active"),
						eq(gamesTable.status, "waiting"),
						eq(gamesTable.status, "paused"),
					),
				)
				.limit(1);

			if (!game || !game.status) {
				return { exists: false as const };
			}

			let [gameState] = await db
				.select({ currentYear: gameStateTable.currentYear })
				.from(gameStateTable)
				.where(eq(gameStateTable.gameId, game.id));

			if (!gameState) {
				await db.insert(gameStateTable).values({
					gameId: game.id,
					currentYear: 1938,
				});
				gameState = { currentYear: 1938 };
			}

			return {
				exists: true as const,
				game: {
					id: game.id,
					status: game.status as GameStatus,
					startDate: game.startDate,
					yearDurations: game.yearDurations as YearDurations,
					createdAt: game.createdAt,
					currentYear: gameState.currentYear,
				},
			};
		},
		{
			response: t.Object({
				exists: t.Boolean(),
				game: t.Optional(ExtendedGameSchema),
			}),
			detail: {
				summary: "Get Current Active Game",
				description:
					"Returns the current active/waiting/paused game if one exists.",
				tags: ["Game"],
			},
		},
	)
	.post(
		"/users",
		async ({ body }) => {
			const [newUser] = await db.insert(usersTable).values(body).returning();
			cacheUser(newUser);
			return {
				id: newUser.id,
				username: newUser.username,
				name: newUser.name,
				email: newUser.email,
				role: newUser.role as UserRole,
				createdAt: newUser.createdAt,
			};
		},
		{
			body: t.Object({
				username: t.String(),
				name: t.String(),
				email: t.String(),
				role: UserRoleSchema,
			}),
			response: UserSchema,
			detail: {
				summary: "Create User",
				description: "Creates a new user in the database.",
				tags: ["User"],
			},
		},
	)
	.patch(
		"/user/:id/country",
		async ({ params, body, query, set }) => {
			// Check if requester is admin
			const [requester] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));

			if (requester.role !== "admin") {
				set.status = 403;
				return {
					error: true as const,
					message: "Only admins can assign countries",
				};
			}

			// Update user's country
			const [updatedUser] = await db
				.update(usersTable)
				.set({ country: body.country })
				.where(eq(usersTable.id, params.id))
				.returning();

			if (!updatedUser) {
				set.status = 404;
				return { error: true as const, message: "User not found" };
			}
			invalidateCachedUser(updatedUser.id);

			return {
				error: false as const,
				user: {
					id: updatedUser.id,
					username: updatedUser.username,
					name: updatedUser.name,
					role: updatedUser.role as UserRole,
					country: updatedUser.country as Country | undefined,
				},
			};
		},
		{
			params: t.Object({
				id: t.String(),
			}),
			body: t.Object({
				country: CountrySchema,
			}),
			response: t.Union([
				t.Object({
					error: t.Literal(false),
					user: UserSchema,
				}),
				ErrorSchema,
			]),
			detail: {
				summary: "Assign Country to User",
				description: "Assigns a country to a user (admin only).",
				tags: ["User"],
			},
		},
	)
	.post(
		"/game/create",
		async ({ query, body, set }) => {
			// Check if user is admin
			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));

			if (!user || user.role !== "admin") {
				set.status = 403;
				return {
					error: true as const,
					message: "Only admins can create games",
				};
			}

			// Check if there's already an active game
			const [existingGame] = await db
				.select()
				.from(gamesTable)
				.where(
					or(
						eq(gamesTable.status, "active"),
						eq(gamesTable.status, "waiting"),
						eq(gamesTable.status, "paused"),
					),
				)
				.limit(1);

			if (existingGame) {
				set.status = 409;
				return {
					error: true as const,
					message: "A game is already in progress",
				};
			}

			const { newGame, countryStates } = db.transaction((tx) => {
				const [newGame] = tx
					.insert(gamesTable)
					.values({
						status: "waiting",
						startDate: new Date(body.startDate),
						yearDurations: body.yearDurations,
					})
					.returning()
					.all();

				tx.insert(gameStateTable)
					.values({
						gameId: newGame.id,
						currentYear: 1938,
					})
					.run();

				const countryStates = [];
				for (const countryName of PLAYABLE_COUNTRIES) {
					const countryConfig = body.countries[countryName];
					const countryRules = COUNTRY_RULES[countryName];
					const [countryState] = tx
						.insert(countryStateTable)
						.values({
							name: countryName,
							gameId: newGame.id,
							oil: countryConfig.oil,
							steel: countryConfig.steel,
							population: countryConfig.population,
							oilLevel: 5,
							steelLevel: 5,
							populationLevel: 5,
							morale: countryRules.startingMorale,
							tokens: countryRules.startingTokens,
							scrapDrivesUsed: 0,
							lastScrapDriveYear: null,
							lastProcessedYear: 1938,
							createdAt: new Date(),
							updatedAt: new Date(),
						})
						.returning()
						.all();

					for (const resourceType of ["oil", "steel", "population"] as const) {
						tx.insert(resourceChangeLogTable)
							.values({
								countryStateId: countryState.id,
								gameId: newGame.id,
								resourceType,
								previousValue: 0,
								newValue: countryConfig[resourceType],
								note: "Starting amount",
								changedBy: user.name,
								createdAt: new Date(),
							})
							.run();
					}

					for (const researchType of RESEARCH_TYPES) {
						const startingLevel =
							countryRules.startingResearch[researchType] ?? 0;
						tx.insert(researchStateTable)
							.values({
								gameId: newGame.id,
								countryStateId: countryState.id,
								researchType,
								level: startingLevel,
								startingLevel,
								updatedAt: new Date(),
							})
							.run();
					}

					for (const location of countryRules.startingTroops) {
						tx.insert(troopLocationTable)
							.values({
								countryStateId: countryState.id,
								gameId: newGame.id,
								name: location.name,
								isHome: location.isHome,
								infantry: location.troops.infantry ?? 0,
								navalShips: location.troops.navalShips ?? 0,
								aircraftCarriers: location.troops.aircraftCarriers ?? 0,
								fighters: location.troops.fighters ?? 0,
								bombers: location.troops.bombers ?? 0,
								spies: location.troops.spies ?? 0,
								submarines: location.troops.submarines ?? 0,
								createdAt: new Date(),
								updatedAt: new Date(),
							})
							.run();
					}

					countryStates.push({
						id: countryState.id,
						name: countryState.name as Country,
						gameId: countryState.gameId,
						oil: countryState.oil,
						steel: countryState.steel,
						population: countryState.population,
						oilLevel: countryState.oilLevel,
						steelLevel: countryState.steelLevel,
						populationLevel: countryState.populationLevel,
						morale: countryState.morale,
						tokens: countryState.tokens,
						scrapDrivesUsed: countryState.scrapDrivesUsed,
						lastScrapDriveYear: countryState.lastScrapDriveYear,
						lastProcessedYear: countryState.lastProcessedYear,
						createdAt: countryState.createdAt,
						updatedAt: countryState.updatedAt,
					});
				}

				return { newGame, countryStates };
			});

			await yearScheduler.initializeGameSchedulesFromDurations(
				newGame.id,
				user.id,
			);

			return {
				error: false as const,
				game: {
					id: newGame.id,
					status: newGame.status as GameStatus,
					startDate: newGame.startDate,
					yearDurations: newGame.yearDurations as YearDurations,
					createdAt: newGame.createdAt,
				},
				countries: countryStates,
			};
		},
		{
			body: CreateGameBodySchema,
			response: t.Union([
				t.Object({
					error: t.Literal(false),
					game: GameSchema,
					countries: t.Array(CountryStateSchema),
				}),
				ErrorSchema,
			]),
			detail: {
				summary: "Create Game",
				description:
					"Creates a new game with all country configurations (admin only).",
				tags: ["Game"],
			},
		},
	)
	.post(
		"/game/:gameId/login-emails",
		async ({ params, query, set }) => {
			const [requester] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));

			if (!requester || requester.role !== "admin") {
				set.status = 403;
				return {
					error: true as const,
					message: "Only admins can send game login emails",
				};
			}

			const gameId = Number.parseInt(params.gameId, 10);
			if (!Number.isInteger(gameId) || gameId <= 0) {
				set.status = 400;
				return { error: true as const, message: "Invalid game ID" };
			}

			const [game] = await db
				.select()
				.from(gamesTable)
				.where(eq(gamesTable.id, gameId));

			if (!game) {
				set.status = 404;
				return { error: true as const, message: "Game not found" };
			}

			if (game.status !== "waiting") {
				set.status = 409;
				return {
					error: true as const,
					message: "Login emails can only be sent while the game is waiting",
				};
			}

			try {
				const result = await sendGameLoginEmails({
					gameId: game.id,
					startDate: game.startDate,
				});
				return { error: false as const, ...result };
			} catch (error) {
				if (error instanceof EmailConfigurationError) {
					set.status = 503;
					return { error: true as const, message: error.message };
				}

				console.error("Failed to send game login emails", error);
				set.status = 500;
				return {
					error: true as const,
					message: "The login emails could not be sent",
				};
			}
		},
		{
			params: t.Object({
				gameId: t.String(),
			}),
			query: t.Object({
				authorization: t.String(),
			}),
			body: t.Object({}),
			response: t.Union([
				t.Object({
					error: t.Literal(false),
					sent: t.Number(),
					failed: t.Number(),
					skipped: t.Number(),
				}),
				ErrorSchema,
			]),
			detail: {
				summary: "Send Game Login Emails",
				description:
					"Sends each assigned player their country, scheduled start time, and personal dashboard login link (admin only).",
				tags: ["Game"],
			},
		},
	)
	.get(
		"/game/:gameId/countries",
		async ({ params, set }) => {
			const gameId = Number.parseInt(params.gameId, 10);
			const countries = await db
				.select()
				.from(countryStateTable)
				.where(eq(countryStateTable.gameId, gameId));

			if (countries.length === 0) {
				set.status = 404;
				return { error: true as const, message: "Game not found" };
			}

			return {
				error: false as const,
				countries: countries.map((c) => ({
					id: c.id,
					name: c.name as Country,
					gameId: c.gameId,
					oil: c.oil,
					steel: c.steel,
					population: c.population,
					oilLevel: c.oilLevel,
					steelLevel: c.steelLevel,
					populationLevel: c.populationLevel,
					morale: c.morale,
					tokens: c.tokens,
					scrapDrivesUsed: c.scrapDrivesUsed,
					lastScrapDriveYear: c.lastScrapDriveYear,
					lastProcessedYear: c.lastProcessedYear,
					createdAt: c.createdAt,
					updatedAt: c.updatedAt,
				})),
			};
		},
		{
			params: t.Object({
				gameId: t.String(),
			}),
			response: t.Union([
				t.Object({
					error: t.Literal(false),
					countries: t.Array(CountryStateSchema),
				}),
				ErrorSchema,
			]),
			detail: {
				summary: "Get Game Countries",
				description: "Returns all country states for a game.",
				tags: ["Game"],
			},
		},
	)
	.get(
		"/game/:gameId/country/name/:countryName",
		async ({ params, set }) => {
			const gameId = Number.parseInt(params.gameId, 10);

			if (!params.countryName) {
				set.status = 404;
				return { error: true as const, message: "No country requested" };
			}

			const [country] = await db
				.select()
				.from(countryStateTable)
				.where(
					and(
						eq(countryStateTable.gameId, gameId),
						eq(countryStateTable.name, params.countryName),
					),
				);

			if (!country) {
				set.status = 404;
				return { error: true as const, message: "Country not found" };
			}

			return {
				error: false as const,
				country: {
					id: country.id,
					name: country.name as Country,
					gameId: country.gameId,
					oil: country.oil,
					steel: country.steel,
					population: country.population,
					oilLevel: country.oilLevel,
					steelLevel: country.steelLevel,
					populationLevel: country.populationLevel,
					morale: country.morale,
					tokens: country.tokens,
					scrapDrivesUsed: country.scrapDrivesUsed,
					lastScrapDriveYear: country.lastScrapDriveYear,
					lastProcessedYear: country.lastProcessedYear,
					createdAt: country.createdAt,
					updatedAt: country.updatedAt,
				},
			};
		},
		{
			params: t.Object({
				gameId: t.String(),
				countryName: CountrySchema,
			}),
			response: t.Union([
				t.Object({
					error: t.Literal(false),
					country: CountryStateSchema,
				}),
				ErrorSchema,
			]),
			detail: {
				summary: "Get Country by Name",
				description: "Returns a specific country state by name for a game.",
				tags: ["Game"],
			},
		},
	)
	.get(
		"/game/:gameId/country/:countryId/history",
		async ({ params }) => {
			const countryId = Number.parseInt(params.countryId, 10);
			const logs = await db
				.select()
				.from(resourceChangeLogTable)
				.where(eq(resourceChangeLogTable.countryStateId, countryId));

			if (logs.length === 0) {
				return { error: false as const, logs: [] };
			}

			return {
				error: false as const,
				logs: logs.map((log) => ({
					id: log.id,
					countryStateId: log.countryStateId,
					gameId: log.gameId,
					resourceType: log.resourceType as "oil" | "steel" | "population",
					previousValue: log.previousValue,
					newValue: log.newValue,
					note: log.note,
					changedBy: log.changedBy,
					createdAt: log.createdAt,
				})),
			};
		},
		{
			params: t.Object({
				gameId: t.String(),
				countryId: t.String(),
			}),
			response: t.Union([
				t.Object({
					error: t.Literal(false),
					logs: t.Array(ResourceChangeLogSchema),
				}),
				ErrorSchema,
			]),
			detail: {
				summary: "Get Country Resource History",
				description: "Returns the resource change history for a country.",
				tags: ["Game"],
			},
		},
	)
	.get(
		"/game/:gameId/year",
		async ({ params, set }) => {
			const gameId = Number.parseInt(params.gameId, 10);

			const [gameState] = await db
				.select()
				.from(gameStateTable)
				.where(eq(gameStateTable.gameId, gameId));

			if (!gameState) {
				set.status = 404;
				return { error: true as const, message: "Game not found" };
			}

			return {
				error: false as const,
				currentYear: gameState.currentYear,
			};
		},
		{
			params: t.Object({
				gameId: t.String(),
			}),
			response: t.Union([
				t.Object({
					error: t.Literal(false),
					currentYear: t.Number(),
				}),
				ErrorSchema,
			]),
			detail: {
				summary: "Get Current Game Year",
				description: "Returns the current year of the game.",
				tags: ["Game"],
			},
		},
	)
	.post(
		"/game/:gameId/next-year",
		async ({ params, query, body, set }) => {
			// Check if user is admin or mod
			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));

			if (!user || (user.role !== "admin" && user.country !== "Mods")) {
				set.status = 403;
				return {
					error: true as const,
					message: "Only admins and mods can advance the year",
				};
			}

			const gameId = Number.parseInt(params.gameId, 10);
			const currentYear = await yearScheduler.getCurrentYear(gameId);
			const targetYear = body?.year ?? currentYear + 1;

			if (targetYear <= currentYear) {
				set.status = 400;
				return {
					error: true as const,
					message: "Target year must be greater than current year",
				};
			}

			await yearScheduler.handleYearChange(gameId, targetYear);
			return { error: false as const };
		},
		{
			body: t.Optional(
				t.Object({
					year: t.Optional(t.Number()),
				}),
			),
			query: t.Object({
				authorization: t.String(),
			}),
		},
	)
	// Year schedules endpoints
	.get(
		"/game/:gameId/year-schedules",
		async ({ params, query, set }) => {
			// Check if user is admin or mod
			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));

			if (!user || (user.role !== "admin" && user.country !== "Mods")) {
				set.status = 403;
				return {
					error: true as const,
					message: "Only admins and mods can view year schedules",
				};
			}

			const gameId = Number.parseInt(params.gameId, 10);
			const schedules = await yearScheduler.getSchedules(gameId);
			const currentYear = await yearScheduler.getCurrentYear(gameId);

			return {
				error: false as const,
				currentYear,
				schedules: schedules.map((s) => ({
					id: s.id,
					gameId: s.gameId,
					scheduledYear: s.scheduledYear,
					scheduledTime: s.scheduledTime,
					createdBy: s.createdBy,
					createdAt: s.createdAt,
				})),
			};
		},
		{
			query: t.Object({
				authorization: t.String(),
			}),
			detail: {
				summary: "Get Year Schedules",
				description: "Returns all scheduled year changes for the game.",
				tags: ["Game"],
			},
		},
	)
	.post(
		"/game/:gameId/year-schedules",
		async ({ params, query, body, set }) => {
			// Check if user is admin or mod
			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));

			if (!user || (user.role !== "admin" && user.country !== "Mods")) {
				set.status = 403;
				return {
					error: true as const,
					message: "Only admins and mods can add year schedules",
				};
			}

			const gameId = Number.parseInt(params.gameId, 10);
			const scheduledTime = new Date(body.scheduledTime);

			if (Number.isNaN(scheduledTime.getTime())) {
				set.status = 400;
				return {
					error: true as const,
					message: "Invalid scheduled time format",
				};
			}

			const result = await yearScheduler.addSchedule(
				gameId,
				body.scheduledYear,
				scheduledTime,
				query.authorization,
			);

			if ("error" in result) {
				set.status = 400;
				return {
					error: true as const,
					message: result.error,
				};
			}

			return {
				error: false as const,
				id: result.id,
			};
		},
		{
			body: t.Object({
				scheduledYear: t.Number(),
				scheduledTime: t.String(),
			}),
			query: t.Object({
				authorization: t.String(),
			}),
			detail: {
				summary: "Add Year Schedule",
				description: "Adds a new scheduled year change for the game.",
				tags: ["Game"],
			},
		},
	)
	.delete(
		"/game/:gameId/year-schedules/:scheduleId",
		async ({ params, query, set }) => {
			// Check if user is admin or mod
			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));

			if (!user || (user.role !== "admin" && user.country !== "Mods")) {
				set.status = 403;
				return {
					error: true as const,
					message: "Only admins and mods can delete year schedules",
				};
			}

			const gameId = Number.parseInt(params.gameId, 10);
			const scheduleId = Number.parseInt(params.scheduleId, 10);

			const result = await yearScheduler.removeSchedule(scheduleId, gameId);

			if ("error" in result) {
				set.status = 404;
				return {
					error: true as const,
					message: result.error,
				};
			}

			return { error: false as const };
		},
		{
			query: t.Object({
				authorization: t.String(),
			}),
			detail: {
				summary: "Delete Year Schedule",
				description: "Removes a scheduled year change for the game.",
				tags: ["Game"],
			},
		},
	)
	.patch(
		"/game/:gameId/year-schedules/:scheduleId",
		async ({ params, query, body, set }) => {
			// Check if user is admin or mod
			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));

			if (!user || (user.role !== "admin" && user.country !== "Mods")) {
				set.status = 403;
				return {
					error: true as const,
					message: "Only admins and mods can update year schedules",
				};
			}

			const gameId = Number.parseInt(params.gameId, 10);
			const scheduleId = Number.parseInt(params.scheduleId, 10);

			const updates: { scheduledYear?: number; scheduledTime?: Date } = {};

			if (body.scheduledYear !== undefined) {
				updates.scheduledYear = body.scheduledYear;
			}

			if (body.scheduledTime !== undefined) {
				const scheduledTime = new Date(body.scheduledTime);
				if (Number.isNaN(scheduledTime.getTime())) {
					set.status = 400;
					return {
						error: true as const,
						message: "Invalid scheduled time format",
					};
				}
				updates.scheduledTime = scheduledTime;
			}

			const result = await yearScheduler.updateSchedule(
				scheduleId,
				gameId,
				updates,
			);

			if ("error" in result) {
				set.status = 400;
				return {
					error: true as const,
					message: result.error,
				};
			}

			return { error: false as const };
		},
		{
			body: t.Object({
				scheduledYear: t.Optional(t.Number()),
				scheduledTime: t.Optional(t.String()),
			}),
			query: t.Object({
				authorization: t.String(),
			}),
			detail: {
				summary: "Update Year Schedule",
				description: "Updates a scheduled year change for the game.",
				tags: ["Game"],
			},
		},
	)
	.patch(
		"/game/:gameId/country/:countryId/resources",
		async ({ params, body, query, set }) => {
			const countryId = Number.parseInt(params.countryId, 10);
			const gameId = Number.parseInt(params.gameId, 10);

			// Get current country state
			const [country] = await db
				.select()
				.from(countryStateTable)
				.where(eq(countryStateTable.id, countryId));

			if (!country) {
				set.status = 404;
				return { error: true as const, message: "Country not found" };
			}

			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));

			if (
				!user ||
				(user.country !== country.name &&
					user.country !== "Mods" &&
					user.role !== "admin")
			) {
				set.status = 403;
				return { error: true as const, message: "Unauthorized" };
			}

			const isMod = user.country === "Mods" || user.role === "admin";

			const oilDelta = body.oilDelta ?? 0;
			const steelDelta = body.steelDelta ?? 0;
			const populationDelta = body.populationDelta ?? 0;

			if (oilDelta === 0 && steelDelta === 0 && populationDelta === 0) {
				set.status = 400;
				return { error: true as const, message: "No changes specified" };
			}

			// Build atomic update using SQL to avoid race conditions
			const updateFields: Record<string, unknown> = {
				updatedAt: new Date(),
			};
			if (oilDelta !== 0) {
				updateFields.oil = sql`${countryStateTable.oil} + ${oilDelta}`;
			}
			if (steelDelta !== 0) {
				updateFields.steel = sql`${countryStateTable.steel} + ${steelDelta}`;
			}
			if (populationDelta !== 0) {
				updateFields.population = sql`${countryStateTable.population} + ${populationDelta}`;
			}

			// Atomically update the country state and get the new values
			let [updatedCountry] = await db
				.update(countryStateTable)
				.set(updateFields)
				.where(eq(countryStateTable.id, countryId))
				.returning();

			// Log changes for each resource that was modified
			const resources = [
				{
					type: "oil" as const,
					delta: oilDelta,
					prev: country.oil,
					curr: updatedCountry.oil,
				},
				{
					type: "steel" as const,
					delta: steelDelta,
					prev: country.steel,
					curr: updatedCountry.steel,
				},
				{
					type: "population" as const,
					delta: populationDelta,
					prev: country.population,
					curr: updatedCountry.population,
				},
			];

			for (const { type, delta, prev, curr } of resources) {
				if (delta !== 0) {
					await db.insert(resourceChangeLogTable).values({
						countryStateId: countryId,
						gameId,
						resourceType: type,
						previousValue: prev,
						newValue: curr,
						note: body.note,
						changedBy: user.name,
						createdAt: new Date(),
					});
				}
			}

			let error = false;
			for (const { type, prev, curr } of resources) {
				// Skip US oil (we don't care if it is negative,
				// only the difference between the values matters on the frontend)
				// Also skip for mods since they may be editing US resources
				if (
					(user.country === "United States" ||
						(isMod && country.name === "United States")) &&
					type === "oil"
				) {
					continue;
				}
				if (curr < 0) {
					const updateField: Record<string, unknown> = {
						updatedAt: new Date(),
					};
					updateField[type] = prev;
					[updatedCountry] = await db
						.update(countryStateTable)
						.set(updateField)
						.where(eq(countryStateTable.id, countryId))
						.returning();
					await db.insert(resourceChangeLogTable).values({
						countryStateId: countryId,
						gameId,
						resourceType: type,
						previousValue: curr,
						newValue: updatedCountry[type],
						note: "Undo change to prevent negative value",
						changedBy: "system",
						createdAt: new Date(),
					});
					error = true;
				}
			}

			// Broadcast resource update to country subscribers
			const countryName = country.name as Country;
			app.server?.publish(
				`country:${countryName}`,
				JSON.stringify({
					type: "server.country.resources",
					country: countryName,
					resources: {
						oil: updatedCountry.oil,
						steel: updatedCountry.steel,
						population: updatedCountry.population,
					},
				}),
			);
			app.server?.publish(
				"country:Mods",
				JSON.stringify({
					type: "server.country.resources",
					country: countryName,
					resources: {
						oil: updatedCountry.oil,
						steel: updatedCountry.steel,
						population: updatedCountry.population,
					},
				}),
			);

			if (error) {
				set.status = 400;
				return {
					error: true as const,
					message:
						"One or more of your changes would have resulted in a negative value. The affected changes have been undone. See the history for details.",
				};
			}

			return {
				error: false as const,
				country: {
					id: updatedCountry.id,
					name: updatedCountry.name as Country,
					gameId: updatedCountry.gameId,
					oil: updatedCountry.oil,
					steel: updatedCountry.steel,
					population: updatedCountry.population,
					oilLevel: updatedCountry.oilLevel,
					steelLevel: updatedCountry.steelLevel,
					populationLevel: updatedCountry.populationLevel,
					morale: updatedCountry.morale,
					tokens: updatedCountry.tokens,
					scrapDrivesUsed: updatedCountry.scrapDrivesUsed,
					lastScrapDriveYear: updatedCountry.lastScrapDriveYear,
					lastProcessedYear: updatedCountry.lastProcessedYear,
					createdAt: updatedCountry.createdAt,
					updatedAt: updatedCountry.updatedAt,
				},
			};
		},
		{
			params: t.Object({
				gameId: t.String(),
				countryId: t.String(),
			}),
			body: t.Object({
				oilDelta: t.Optional(t.Number()),
				steelDelta: t.Optional(t.Number()),
				populationDelta: t.Optional(t.Number()),
				note: t.String(),
			}),
			response: t.Union([
				t.Object({
					error: t.Literal(false),
					country: CountryStateSchema,
				}),
				ErrorSchema,
			]),
			detail: {
				summary: "Update Country Resources",
				description:
					"Updates country resources and logs the change with a note.",
				tags: ["Game"],
			},
		},
	)
	.get(
		"/game/:gameId/country/:countryId/trades",
		async ({ params, query, set }) => {
			const countryId = Number.parseInt(params.countryId, 10);
			const [country] = await db
				.select()
				.from(countryStateTable)
				.where(eq(countryStateTable.id, countryId));
			if (!country) {
				set.status = 404;
				return { error: true as const, message: "Country not found" };
			}

			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));
			if (!user) {
				set.status = 401;
				return { error: true as const, message: "Unauthorized" };
			}
			if (
				user.country !== country.name &&
				user.country !== "Mods" &&
				user.role !== "admin"
			) {
				set.status = 403;
				return { error: true as const, message: "Unauthorized" };
			}

			const trades = await db
				.select()
				.from(tradeRequestTable)
				.where(
					and(
						eq(tradeRequestTable.gameId, Number.parseInt(params.gameId, 10)),
						eq(tradeRequestTable.status, "pending"),
						or(
							eq(tradeRequestTable.initiatorCountryStateId, countryId),
							eq(tradeRequestTable.recipientCountryStateId, countryId),
						),
					),
				);

			const relatedCountries = await db
				.select()
				.from(countryStateTable)
				.where(
					eq(countryStateTable.gameId, Number.parseInt(params.gameId, 10)),
				);

			const countryNameById = new Map(
				relatedCountries.map((c) => [c.id, c.name]),
			);
			const requests = trades.map((trade) => ({
				id: trade.id,
				gameId: trade.gameId,
				initiatorCountryStateId: trade.initiatorCountryStateId,
				recipientCountryStateId: trade.recipientCountryStateId,
				initiatorCountryName: (countryNameById.get(
					trade.initiatorCountryStateId,
				) ?? "Commonwealth") as Country,
				recipientCountryName: (countryNameById.get(
					trade.recipientCountryStateId,
				) ?? "Commonwealth") as Country,
				initiatorResources: {
					oil: trade.initiatorOil,
					steel: trade.initiatorSteel,
					population: trade.initiatorPopulation,
				},
				recipientResources: {
					oil: trade.recipientOil,
					steel: trade.recipientSteel,
					population: trade.recipientPopulation,
				},
				...calculateTradeCosts({
					initiatorOil: trade.initiatorOil,
					initiatorSteel: trade.initiatorSteel,
					initiatorPopulation: trade.initiatorPopulation,
					recipientOil: trade.recipientOil,
					recipientSteel: trade.recipientSteel,
					recipientPopulation: trade.recipientPopulation,
				}),
				status: trade.status,
				createdBy: trade.createdBy,
				createdAt: trade.createdAt,
				updatedAt: trade.updatedAt,
			}));

			return {
				error: false as const,
				incoming: requests.filter(
					(trade) => trade.recipientCountryStateId === countryId,
				),
				outgoing: requests.filter(
					(trade) => trade.initiatorCountryStateId === countryId,
				),
			};
		},
		{
			params: t.Object({ gameId: t.String(), countryId: t.String() }),
			query: t.Object({ authorization: t.String() }),
			response: t.Union([
				t.Object({
					error: t.Literal(false),
					incoming: t.Array(TradeRequestSchema),
					outgoing: t.Array(TradeRequestSchema),
				}),
				ErrorSchema,
			]),
			detail: {
				summary: "Get Country Trades",
				description: "Returns incoming and outgoing pending trade requests.",
				tags: ["Game"],
			},
		},
	)
	.post(
		"/game/:gameId/country/:countryId/trades",
		async ({ params, query, body, set }) => {
			const countryId = Number.parseInt(params.countryId, 10);
			const gameId = Number.parseInt(params.gameId, 10);
			const [initiator] = await db
				.select()
				.from(countryStateTable)
				.where(eq(countryStateTable.id, countryId));
			if (!initiator) {
				set.status = 404;
				return { error: true as const, message: "Country not found" };
			}

			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));
			if (!user) {
				set.status = 401;
				return { error: true as const, message: "Unauthorized" };
			}
			if (user.country !== initiator.name && user.country !== "Mods") {
				set.status = 403;
				return { error: true as const, message: "Unauthorized" };
			}

			const [recipient] = await db
				.select()
				.from(countryStateTable)
				.where(
					and(
						eq(countryStateTable.gameId, gameId),
						eq(countryStateTable.name, body.recipientCountryName),
					),
				);
			if (!recipient) {
				set.status = 404;
				return { error: true as const, message: "Recipient country not found" };
			}
			if (recipient.id === initiator.id) {
				set.status = 400;
				return { error: true as const, message: "Cannot trade with yourself" };
			}
			if (
				body.initiatorResources.oil < 0 ||
				body.initiatorResources.steel < 0 ||
				body.initiatorResources.population < 0 ||
				body.recipientResources.oil < 0 ||
				body.recipientResources.steel < 0 ||
				body.recipientResources.population < 0
			) {
				set.status = 400;
				return {
					error: true as const,
					message: "Trade resource values cannot be negative",
				};
			}

			const { totalResources, steelRequirement } = calculateTradeCosts({
				initiatorOil: body.initiatorResources.oil,
				initiatorSteel: body.initiatorResources.steel,
				initiatorPopulation: body.initiatorResources.population,
				recipientOil: body.recipientResources.oil,
				recipientSteel: body.recipientResources.steel,
				recipientPopulation: body.recipientResources.population,
			});

			if (totalResources <= 0) {
				set.status = 400;
				return {
					error: true as const,
					message: "Trade must include resources",
				};
			}

			if (initiator.steel < steelRequirement) {
				set.status = 400;
				return {
					error: true as const,
					message: `Not enough steel to initiate trade (requires ${steelRequirement})`,
				};
			}

			await db.insert(tradeRequestTable).values({
				gameId,
				initiatorCountryStateId: initiator.id,
				recipientCountryStateId: recipient.id,
				initiatorOil: body.initiatorResources.oil,
				initiatorSteel: body.initiatorResources.steel,
				initiatorPopulation: body.initiatorResources.population,
				recipientOil: body.recipientResources.oil,
				recipientSteel: body.recipientResources.steel,
				recipientPopulation: body.recipientResources.population,
				status: "pending",
				createdBy: user.id,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			return { error: false as const };
		},
		{
			params: t.Object({ gameId: t.String(), countryId: t.String() }),
			query: t.Object({ authorization: t.String() }),
			body: t.Object({
				recipientCountryName: PlayableCountrySchema,
				initiatorResources: TradeResourcesSchema,
				recipientResources: TradeResourcesSchema,
			}),
			response: t.Union([t.Object({ error: t.Literal(false) }), ErrorSchema]),
			detail: {
				summary: "Create Trade Request",
				description:
					"Creates a pending trade request from one country to another.",
				tags: ["Game"],
			},
		},
	)
	.post(
		"/game/:gameId/country/:countryId/trades/accept",
		async ({ params, query, body, set }) => {
			const gameId = Number.parseInt(params.gameId, 10);
			const countryId = Number.parseInt(params.countryId, 10);

			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));
			if (!user) {
				set.status = 401;
				return { error: true as const, message: "Unauthorized" };
			}

			const tradeOutcome = db.transaction((tx) => {
				const [trade] = tx
					.select()
					.from(tradeRequestTable)
					.where(
						and(
							eq(tradeRequestTable.id, body.tradeId),
							eq(tradeRequestTable.gameId, gameId),
							eq(tradeRequestTable.status, "pending"),
						),
					)
					.all();
				if (!trade) return { error: "Trade request not found" } as const;
				if (trade.recipientCountryStateId !== countryId) {
					return { error: "Only the recipient can accept this trade" } as const;
				}

				const [initiator] = tx
					.select()
					.from(countryStateTable)
					.where(eq(countryStateTable.id, trade.initiatorCountryStateId))
					.all();
				const [recipient] = tx
					.select()
					.from(countryStateTable)
					.where(eq(countryStateTable.id, trade.recipientCountryStateId))
					.all();

				if (!initiator || !recipient) {
					return { error: "Country not found for trade" } as const;
				}
				if (user.country !== recipient.name && user.country !== "Mods") {
					return { error: "Unauthorized" } as const;
				}

				const { oilCost, steelRequirement } = calculateTradeCosts({
					initiatorOil: trade.initiatorOil,
					initiatorSteel: trade.initiatorSteel,
					initiatorPopulation: trade.initiatorPopulation,
					recipientOil: trade.recipientOil,
					recipientSteel: trade.recipientSteel,
					recipientPopulation: trade.recipientPopulation,
				});

				if (initiator.oil < trade.initiatorOil + oilCost) {
					return {
						error: "Initiating country does not have enough oil",
					} as const;
				}
				if (initiator.steel < trade.initiatorSteel + steelRequirement) {
					return {
						error: "Initiating country does not meet steel requirements",
					} as const;
				}
				if (recipient.oil < trade.recipientOil) {
					return {
						error: "Recipient country does not have enough oil",
					} as const;
				}
				if (recipient.steel < trade.recipientSteel) {
					return {
						error: "Recipient country does not have enough steel",
					} as const;
				}
				if (initiator.population < trade.initiatorPopulation) {
					return {
						error: "Initiating country does not have enough population",
					} as const;
				}
				if (recipient.population < trade.recipientPopulation) {
					return {
						error: "Recipient country does not have enough population",
					} as const;
				}

				const [updatedInitiator] = tx
					.update(countryStateTable)
					.set({
						oil:
							initiator.oil - trade.initiatorOil - oilCost + trade.recipientOil,
						steel:
							initiator.steel -
							trade.initiatorSteel -
							steelRequirement +
							trade.recipientSteel,
						population:
							initiator.population -
							trade.initiatorPopulation +
							trade.recipientPopulation,
						updatedAt: new Date(),
					})
					.where(eq(countryStateTable.id, initiator.id))
					.returning()
					.all();
				const [updatedRecipient] = tx
					.update(countryStateTable)
					.set({
						oil: recipient.oil - trade.recipientOil + trade.initiatorOil,
						steel:
							recipient.steel - trade.recipientSteel + trade.initiatorSteel,
						population:
							recipient.population -
							trade.recipientPopulation +
							trade.initiatorPopulation,
						updatedAt: new Date(),
					})
					.where(eq(countryStateTable.id, recipient.id))
					.returning()
					.all();

				const tradeSummary = `Trade with ${recipient.name}: sent ${trade.initiatorSteel} steel, ${trade.initiatorOil} oil, and ${trade.initiatorPopulation} population; received ${trade.recipientSteel} steel, ${trade.recipientOil} oil, and ${trade.recipientPopulation} population; paid ${oilCost} oil and ${steelRequirement} steel transport cost`;
				const recipientSummary = `Trade with ${initiator.name}: sent ${trade.recipientSteel} steel, ${trade.recipientOil} oil, and ${trade.recipientPopulation} population; received ${trade.initiatorSteel} steel, ${trade.initiatorOil} oil, and ${trade.initiatorPopulation} population`;

				const initiatorDeltas = [
					{
						type: "oil" as const,
						prev: initiator.oil,
						curr: updatedInitiator.oil,
						note: tradeSummary,
					},
					{
						type: "steel" as const,
						prev: initiator.steel,
						curr: updatedInitiator.steel,
						note: tradeSummary,
					},
					{
						type: "population" as const,
						prev: initiator.population,
						curr: updatedInitiator.population,
						note: tradeSummary,
					},
				];
				const recipientDeltas = [
					{
						type: "oil" as const,
						prev: recipient.oil,
						curr: updatedRecipient.oil,
						note: recipientSummary,
					},
					{
						type: "steel" as const,
						prev: recipient.steel,
						curr: updatedRecipient.steel,
						note: recipientSummary,
					},
					{
						type: "population" as const,
						prev: recipient.population,
						curr: updatedRecipient.population,
						note: recipientSummary,
					},
				];

				for (const delta of initiatorDeltas) {
					if (delta.prev === delta.curr) continue;
					tx.insert(resourceChangeLogTable)
						.values({
							countryStateId: initiator.id,
							gameId,
							resourceType: delta.type,
							previousValue: delta.prev,
							newValue: delta.curr,
							note: delta.note,
							changedBy: user.name,
							createdAt: new Date(),
						})
						.run();
				}
				for (const delta of recipientDeltas) {
					if (delta.prev === delta.curr) continue;
					tx.insert(resourceChangeLogTable)
						.values({
							countryStateId: recipient.id,
							gameId,
							resourceType: delta.type,
							previousValue: delta.prev,
							newValue: delta.curr,
							note: delta.note,
							changedBy: user.name,
							createdAt: new Date(),
						})
						.run();
				}

				tx.update(tradeRequestTable)
					.set({ status: "accepted", updatedAt: new Date() })
					.where(eq(tradeRequestTable.id, trade.id))
					.run();

				return {
					error: null,
					initiatorName: initiator.name as Country,
					recipientName: recipient.name as Country,
					initiatorResources: {
						oil: updatedInitiator.oil,
						steel: updatedInitiator.steel,
						population: updatedInitiator.population,
					},
					recipientResources: {
						oil: updatedRecipient.oil,
						steel: updatedRecipient.steel,
						population: updatedRecipient.population,
					},
				} as const;
			});

			if (tradeOutcome.error) {
				set.status = tradeOutcome.error === "Unauthorized" ? 403 : 400;
				return { error: true as const, message: tradeOutcome.error };
			}

			app.server?.publish(
				`country:${tradeOutcome.initiatorName}`,
				JSON.stringify({
					type: "server.country.resources",
					country: tradeOutcome.initiatorName,
					resources: tradeOutcome.initiatorResources,
				}),
			);
			app.server?.publish(
				"country:Mods",
				JSON.stringify({
					type: "server.country.resources",
					country: tradeOutcome.initiatorName,
					resources: tradeOutcome.initiatorResources,
				}),
			);
			app.server?.publish(
				`country:${tradeOutcome.recipientName}`,
				JSON.stringify({
					type: "server.country.resources",
					country: tradeOutcome.recipientName,
					resources: tradeOutcome.recipientResources,
				}),
			);
			app.server?.publish(
				"country:Mods",
				JSON.stringify({
					type: "server.country.resources",
					country: tradeOutcome.recipientName,
					resources: tradeOutcome.recipientResources,
				}),
			);

			return { error: false as const };
		},
		{
			params: t.Object({ gameId: t.String(), countryId: t.String() }),
			query: t.Object({ authorization: t.String() }),
			body: t.Object({
				tradeId: t.Number(),
			}),
			response: t.Union([t.Object({ error: t.Literal(false) }), ErrorSchema]),
			detail: {
				summary: "Accept Trade Request",
				description:
					"Accepts a pending trade request and applies resource transfers.",
				tags: ["Game"],
			},
		},
	)
	.post(
		"/game/:gameId/country/:countryId/trades/reject",
		async ({ params, query, body, set }) => {
			const gameId = Number.parseInt(params.gameId, 10);
			const countryId = Number.parseInt(params.countryId, 10);

			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));
			if (!user) {
				set.status = 401;
				return { error: true as const, message: "Unauthorized" };
			}

			const [trade] = await db
				.select()
				.from(tradeRequestTable)
				.where(
					and(
						eq(tradeRequestTable.id, body.tradeId),
						eq(tradeRequestTable.gameId, gameId),
						eq(tradeRequestTable.status, "pending"),
					),
				);
			if (!trade) {
				set.status = 404;
				return { error: true as const, message: "Trade request not found" };
			}

			if (trade.recipientCountryStateId !== countryId) {
				set.status = 403;
				return {
					error: true as const,
					message: "Only the recipient can reject this trade",
				};
			}

			const [recipient] = await db
				.select()
				.from(countryStateTable)
				.where(eq(countryStateTable.id, countryId));
			if (!recipient) {
				set.status = 404;
				return { error: true as const, message: "Country not found" };
			}
			if (user.country !== recipient.name && user.country !== "Mods") {
				set.status = 403;
				return { error: true as const, message: "Unauthorized" };
			}

			await db
				.update(tradeRequestTable)
				.set({ status: "rejected", updatedAt: new Date() })
				.where(eq(tradeRequestTable.id, trade.id));

			return { error: false as const };
		},
		{
			params: t.Object({ gameId: t.String(), countryId: t.String() }),
			query: t.Object({ authorization: t.String() }),
			body: t.Object({
				tradeId: t.Number(),
			}),
			response: t.Union([t.Object({ error: t.Literal(false) }), ErrorSchema]),
			detail: {
				summary: "Reject Trade Request",
				description: "Rejects a pending trade request.",
				tags: ["Game"],
			},
		},
	)
	.get(
		"/game/:gameId/country/:countryId/rules",
		async ({ params, query, set }) => {
			const countryId = Number.parseInt(params.countryId, 10);
			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));
			const [country] = await db
				.select()
				.from(countryStateTable)
				.where(eq(countryStateTable.id, countryId));
			if (!user || !country) {
				set.status = 404;
				return { error: true as const, message: "Country not found" };
			}
			if (country.name === "Mods") {
				set.status = 400;
				return {
					error: true as const,
					message: "Mods do not have country rules",
				};
			}
			if (
				user.country !== country.name &&
				user.country !== "Mods" &&
				user.role !== "admin"
			) {
				set.status = 403;
				return { error: true as const, message: "Unauthorized" };
			}
			return {
				error: false as const,
				rules: COUNTRY_RULES[country.name as PlayableCountry],
				country,
			};
		},
		{
			params: t.Object({ gameId: t.String(), countryId: t.String() }),
			query: t.Object({ authorization: t.String() }),
		},
	)
	.patch(
		"/game/:gameId/country/:countryId/stats",
		async ({ params, query, body, set }) => {
			const countryId = Number.parseInt(params.countryId, 10);
			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));
			if (!user || (user.country !== "Mods" && user.role !== "admin")) {
				set.status = 403;
				return {
					error: true as const,
					message: "Only moderators can update stats",
				};
			}
			const updates: Record<string, number | Date> = { updatedAt: new Date() };
			if (body.morale !== undefined)
				updates.morale = Math.min(100, Math.max(0, body.morale));
			if (body.tokens !== undefined) updates.tokens = Math.max(0, body.tokens);
			if (body.oilLevel !== undefined)
				updates.oilLevel = Math.min(20, Math.max(1, body.oilLevel));
			if (body.steelLevel !== undefined)
				updates.steelLevel = Math.min(20, Math.max(1, body.steelLevel));
			if (body.populationLevel !== undefined)
				updates.populationLevel = Math.min(
					20,
					Math.max(1, body.populationLevel),
				);
			const [country] = await db
				.update(countryStateTable)
				.set(updates)
				.where(eq(countryStateTable.id, countryId))
				.returning();
			if (!country) {
				set.status = 404;
				return { error: true as const, message: "Country not found" };
			}
			return { error: false as const, country };
		},
		{
			params: t.Object({ gameId: t.String(), countryId: t.String() }),
			query: t.Object({ authorization: t.String() }),
			body: t.Object({
				morale: t.Optional(t.Number()),
				tokens: t.Optional(t.Number()),
				oilLevel: t.Optional(t.Number()),
				steelLevel: t.Optional(t.Number()),
				populationLevel: t.Optional(t.Number()),
			}),
		},
	)
	.post(
		"/game/:gameId/country/:countryId/scrap-drive",
		async ({ params, query, set }) => {
			const gameId = Number.parseInt(params.gameId, 10);
			const countryId = Number.parseInt(params.countryId, 10);
			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));
			const [currentGameState] = await db
				.select()
				.from(gameStateTable)
				.where(eq(gameStateTable.gameId, gameId));
			if (!user || !currentGameState) {
				set.status = 404;
				return { error: true as const, message: "Game or player not found" };
			}

			const result = db.transaction((tx) => {
				const [country] = tx
					.select()
					.from(countryStateTable)
					.where(
						and(
							eq(countryStateTable.id, countryId),
							eq(countryStateTable.gameId, gameId),
						),
					)
					.all();
				if (
					!country ||
					(user.country !== country.name &&
						user.country !== "Mods" &&
						user.role !== "admin")
				)
					return { error: "Unauthorized" } as const;
				if (country.scrapDrivesUsed >= 3)
					return {
						error: "This country has already used all three scrap metal drives",
					} as const;
				if (country.lastScrapDriveYear === currentGameState.currentYear)
					return {
						error: "A country may run only one scrap metal drive each year",
					} as const;

				const diceCount = [4, 2, 1][country.scrapDrivesUsed];
				const rolls = Array.from({ length: diceCount }, () => randomInt(1, 7));
				const steelGained = rolls.reduce((total, roll) => total + roll, 0);
				const [updatedCountry] = tx
					.update(countryStateTable)
					.set({
						steel: country.steel + steelGained,
						scrapDrivesUsed: country.scrapDrivesUsed + 1,
						lastScrapDriveYear: currentGameState.currentYear,
						updatedAt: new Date(),
					})
					.where(eq(countryStateTable.id, country.id))
					.returning()
					.all();
				tx.insert(resourceChangeLogTable)
					.values({
						countryStateId: country.id,
						gameId,
						resourceType: "steel",
						previousValue: country.steel,
						newValue: updatedCountry.steel,
						note: `${currentGameState.currentYear} scrap metal drive (${rolls.join(" + ")})`,
						changedBy: user.name,
						createdAt: new Date(),
					})
					.run();
				return { error: null, rolls, steelGained, country: updatedCountry };
			});
			if (result.error) {
				set.status = result.error === "Unauthorized" ? 403 : 400;
				return { error: true as const, message: result.error };
			}
			return {
				error: false as const,
				rolls: result.rolls,
				steelGained: result.steelGained,
				country: result.country,
			};
		},
		{
			params: t.Object({ gameId: t.String(), countryId: t.String() }),
			query: t.Object({ authorization: t.String() }),
		},
	)
	.get(
		"/game/:gameId/country/:countryId/research",
		async ({ params, query, set }) => {
			const countryId = Number.parseInt(params.countryId, 10);
			const gameId = Number.parseInt(params.gameId, 10);
			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));
			const [country] = await db
				.select()
				.from(countryStateTable)
				.where(eq(countryStateTable.id, countryId));
			if (
				!user ||
				!country ||
				(user.country !== country.name &&
					user.country !== "Mods" &&
					user.role !== "admin")
			) {
				set.status = 403;
				return { error: true as const, message: "Unauthorized" };
			}
			if (country.name === "Mods") {
				set.status = 400;
				return { error: true as const, message: "Invalid country" };
			}
			const states = await db
				.select()
				.from(researchStateTable)
				.where(eq(researchStateTable.countryStateId, countryId));
			const requests = await db
				.select()
				.from(researchRequestTable)
				.where(
					and(
						eq(researchRequestTable.gameId, gameId),
						eq(researchRequestTable.countryStateId, countryId),
					),
				);
			const countryRules = COUNTRY_RULES[country.name as PlayableCountry];
			return {
				error: false as const,
				states,
				requests,
				rules: RESEARCH_TYPES.map((researchType) => ({
					researchType,
					...RESEARCH_RULES[researchType],
					cost: countryRules.researchCosts[researchType],
				})),
			};
		},
		{
			params: t.Object({ gameId: t.String(), countryId: t.String() }),
			query: t.Object({ authorization: t.String() }),
		},
	)
	.post(
		"/game/:gameId/country/:countryId/research",
		async ({ params, query, body, set }) => {
			const countryId = Number.parseInt(params.countryId, 10);
			const gameId = Number.parseInt(params.gameId, 10);
			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));
			const [country] = await db
				.select()
				.from(countryStateTable)
				.where(eq(countryStateTable.id, countryId));
			if (
				!user ||
				!country ||
				(user.country !== country.name &&
					user.country !== "Mods" &&
					user.role !== "admin")
			) {
				set.status = 403;
				return { error: true as const, message: "Unauthorized" };
			}
			if (country.name === "Mods") {
				set.status = 400;
				return { error: true as const, message: "Invalid country" };
			}
			const researchType = body.researchType as ResearchType;
			const [state] = await db
				.select()
				.from(researchStateTable)
				.where(
					and(
						eq(researchStateTable.countryStateId, countryId),
						eq(researchStateTable.researchType, researchType),
					),
				);
			if (!state) {
				set.status = 404;
				return { error: true as const, message: "Research state not found" };
			}
			if (state.level >= RESEARCH_RULES[researchType].maxLevel) {
				set.status = 400;
				return {
					error: true as const,
					message: "Research is already at its maximum level",
				};
			}
			const [pending] = await db
				.select()
				.from(researchRequestTable)
				.where(
					and(
						eq(researchRequestTable.countryStateId, countryId),
						eq(researchRequestTable.researchType, researchType),
						eq(researchRequestTable.status, "pending"),
					),
				);
			if (pending) {
				set.status = 409;
				return {
					error: true as const,
					message: "This research already has a pending roll",
				};
			}
			const cost =
				COUNTRY_RULES[country.name as PlayableCountry].researchCosts[
					researchType
				];
			if (country.steel < cost.steel || country.population < cost.population) {
				set.status = 400;
				return {
					error: true as const,
					message: "Not enough resources for this research",
				};
			}
			const [request] = await db
				.insert(researchRequestTable)
				.values({
					gameId,
					countryStateId: countryId,
					researchType,
					targetLevel: state.level + 1,
					steelCost: cost.steel,
					populationCost: cost.population,
					status: "pending",
					plan: body.plan?.trim() || null,
					createdBy: user.id,
					createdAt: new Date(),
				})
				.returning();
			return {
				error: false as const,
				request,
				correctDiceNeeded: state.level - state.startingLevel + 1,
			};
		},
		{
			params: t.Object({ gameId: t.String(), countryId: t.String() }),
			query: t.Object({ authorization: t.String() }),
			body: t.Object({
				researchType: ResearchTypeSchema,
				plan: t.Optional(t.String()),
			}),
		},
	)
	.patch(
		"/game/:gameId/country/:countryId/research/:requestId",
		async ({ params, query, body, set }) => {
			const countryId = Number.parseInt(params.countryId, 10);
			const requestId = Number.parseInt(params.requestId, 10);
			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));
			if (!user || (user.country !== "Mods" && user.role !== "admin")) {
				set.status = 403;
				return {
					error: true as const,
					message: "Only moderators can resolve research",
				};
			}
			const result = db.transaction((tx) => {
				const [request] = tx
					.select()
					.from(researchRequestTable)
					.where(
						and(
							eq(researchRequestTable.id, requestId),
							eq(researchRequestTable.countryStateId, countryId),
							eq(researchRequestTable.status, "pending"),
						),
					)
					.all();
				if (!request)
					return { error: "Pending research request not found" } as const;
				const [country] = tx
					.select()
					.from(countryStateTable)
					.where(eq(countryStateTable.id, countryId))
					.all();
				const [state] = tx
					.select()
					.from(researchStateTable)
					.where(
						and(
							eq(researchStateTable.countryStateId, countryId),
							eq(researchStateTable.researchType, request.researchType),
						),
					)
					.all();
				if (!country || !state)
					return { error: "Country or research state not found" } as const;
				const succeeds = body.status === "succeeded";
				const steelCost = succeeds
					? request.steelCost
					: Math.ceil(request.steelCost / 2);
				const populationCost = succeeds
					? request.populationCost
					: Math.ceil(request.populationCost / 2);
				if (country.steel < steelCost || country.population < populationCost)
					return { error: "Country no longer has enough resources" } as const;
				const [updatedCountry] = tx
					.update(countryStateTable)
					.set({
						steel: country.steel - steelCost,
						population: country.population - populationCost,
						updatedAt: new Date(),
					})
					.where(eq(countryStateTable.id, countryId))
					.returning()
					.all();
				for (const resource of ["steel", "population"] as const) {
					if (country[resource] === updatedCountry[resource]) continue;
					tx.insert(resourceChangeLogTable)
						.values({
							countryStateId: countryId,
							gameId: request.gameId,
							resourceType: resource,
							previousValue: country[resource],
							newValue: updatedCountry[resource],
							note: `${succeeds ? "Successful" : "Failed"} ${RESEARCH_RULES[request.researchType as ResearchType].label} research`,
							changedBy: user.name,
							createdAt: new Date(),
						})
						.run();
				}
				if (succeeds)
					tx.update(researchStateTable)
						.set({ level: request.targetLevel, updatedAt: new Date() })
						.where(eq(researchStateTable.id, state.id))
						.run();
				tx.update(researchRequestTable)
					.set({
						status: body.status,
						moderatorNote: body.moderatorNote?.trim() || null,
						resolvedBy: user.id,
						resolvedAt: new Date(),
					})
					.where(eq(researchRequestTable.id, request.id))
					.run();
				return { error: null, country: updatedCountry } as const;
			});
			if (result.error) {
				set.status = 400;
				return { error: true as const, message: result.error };
			}
			return { error: false as const, country: result.country };
		},
		{
			params: t.Object({
				gameId: t.String(),
				countryId: t.String(),
				requestId: t.String(),
			}),
			query: t.Object({ authorization: t.String() }),
			body: t.Object({
				status: t.Union([t.Literal("succeeded"), t.Literal("failed")]),
				moderatorNote: t.Optional(t.String()),
			}),
		},
	)
	.get(
		"/game/:gameId/actions",
		async ({ params, query }) => {
			const gameId = Number.parseInt(params.gameId, 10);
			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));
			const requests = await db
				.select({
					request: actionRequestTable,
					countryName: countryStateTable.name,
					creatorName: usersTable.name,
				})
				.from(actionRequestTable)
				.innerJoin(
					countryStateTable,
					eq(actionRequestTable.countryStateId, countryStateTable.id),
				)
				.leftJoin(usersTable, eq(actionRequestTable.createdBy, usersTable.id))
				.where(eq(actionRequestTable.gameId, gameId))
				.orderBy(actionRequestTable.createdAt);
			return {
				error: false as const,
				actions: requests.map(({ request, countryName, creatorName }) => {
					const canSeePrivate =
						user?.country === "Mods" ||
						user?.role === "admin" ||
						user?.country === countryName;
					const payload = request.payload ? { ...request.payload } : null;
					if (payload && !canSeePrivate) {
						delete payload.plan;
						delete payload.troops;
						delete payload.sourceLocationId;
						delete payload.sourceLocationName;
						delete payload.highLow;
					}
					return {
						...request,
						payload,
						countryName,
						createdBy: creatorName ?? "Unknown",
					};
				}),
			};
		},
		{
			params: t.Object({ gameId: t.String() }),
			query: t.Object({ authorization: t.String() }),
		},
	)
	.post(
		"/game/:gameId/country/:countryId/actions",
		async ({ params, query, body, set }) => {
			const gameId = Number.parseInt(params.gameId, 10);
			const countryId = Number.parseInt(params.countryId, 10);
			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));
			const [country] = await db
				.select()
				.from(countryStateTable)
				.where(eq(countryStateTable.id, countryId));
			if (
				!user ||
				!country ||
				(user.country !== country.name &&
					user.country !== "Mods" &&
					user.role !== "admin")
			) {
				set.status = 403;
				return { error: true as const, message: "Unauthorized" };
			}
			let sourceLocationName: string | undefined;
			if (body.type === "battle") {
				if (
					!body.sourceLocationId ||
					!body.targetLocation?.trim() ||
					!body.highLow ||
					!body.plan?.trim() ||
					!body.troops
				) {
					set.status = 400;
					return {
						error: true as const,
						message:
							"Battle plans require a source, target, high/low choice, troop counts, and written plan",
					};
				}
				const [location] = await db
					.select()
					.from(troopLocationTable)
					.where(
						and(
							eq(troopLocationTable.id, body.sourceLocationId),
							eq(troopLocationTable.countryStateId, countryId),
						),
					);
				if (!location) {
					set.status = 404;
					return { error: true as const, message: "Source location not found" };
				}
				sourceLocationName = location.name;
				let total = 0;
				for (const troopType of TROOP_TYPES) {
					const amount = body.troops[troopType];
					if (amount < 0 || amount > location[troopType]) {
						set.status = 400;
						return {
							error: true as const,
							message: `Invalid ${troopType} amount for ${location.name}`,
						};
					}
					total += amount;
				}
				if (total === 0) {
					set.status = 400;
					return {
						error: true as const,
						message: "A battle plan must send at least one troop die",
					};
				}
			}
			const payload = {
				sourceLocationId: body.sourceLocationId,
				sourceLocationName,
				targetLocation: body.targetLocation,
				targetCountry: body.targetCountry,
				highLow: body.highLow,
				troops: body.troops,
				plan: body.plan,
			};
			const [request] = await db
				.insert(actionRequestTable)
				.values({
					gameId,
					countryStateId: countryId,
					type: body.type,
					title: body.title.trim(),
					description: body.description.trim(),
					payload,
					status: "pending",
					createdBy: user.id,
					createdAt: new Date(),
					updatedAt: new Date(),
				})
				.returning();
			return { error: false as const, request };
		},
		{
			params: t.Object({ gameId: t.String(), countryId: t.String() }),
			query: t.Object({ authorization: t.String() }),
			body: t.Object({
				type: ActionRequestTypeSchema,
				title: t.String({ minLength: 1, maxLength: 120 }),
				description: t.String({ minLength: 1, maxLength: 4000 }),
				sourceLocationId: t.Optional(t.Number()),
				targetLocation: t.Optional(t.String()),
				targetCountry: t.Optional(PlayableCountrySchema),
				highLow: t.Optional(t.Union([t.Literal("high"), t.Literal("low")])),
				troops: t.Optional(TroopCountsSchema),
				plan: t.Optional(t.String()),
			}),
		},
	)
	.patch(
		"/game/:gameId/actions/:actionId",
		async ({ params, query, body, set }) => {
			const actionId = Number.parseInt(params.actionId, 10);
			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));
			if (!user || (user.country !== "Mods" && user.role !== "admin")) {
				set.status = 403;
				return {
					error: true as const,
					message: "Only moderators can update the queue",
				};
			}
			const [request] = await db
				.update(actionRequestTable)
				.set({
					status: body.status,
					response: body.response?.trim() || null,
					resolvedBy:
						body.status === "resolved" || body.status === "denied"
							? user.id
							: null,
					updatedAt: new Date(),
				})
				.where(eq(actionRequestTable.id, actionId))
				.returning();
			if (!request) {
				set.status = 404;
				return { error: true as const, message: "Action request not found" };
			}
			return { error: false as const, request };
		},
		{
			params: t.Object({ gameId: t.String(), actionId: t.String() }),
			query: t.Object({ authorization: t.String() }),
			body: t.Object({
				status: ActionRequestStatusSchema,
				response: t.Optional(t.String()),
			}),
		},
	)
	// --- Troop endpoints ---
	.get(
		"/game/:gameId/country/:countryId/troops",
		async ({ params, query, set }) => {
			const countryId = Number.parseInt(params.countryId, 10);
			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));
			if (!user) {
				set.status = 401;
				return { error: true as const, message: "Unauthorized" };
			}

			const [country] = await db
				.select()
				.from(countryStateTable)
				.where(eq(countryStateTable.id, countryId));
			if (!country) {
				set.status = 404;
				return { error: true as const, message: "Country not found" };
			}
			if (
				user.country !== country.name &&
				user.country !== "Mods" &&
				user.role !== "admin"
			) {
				set.status = 403;
				return { error: true as const, message: "Unauthorized" };
			}

			const locations = await db
				.select()
				.from(troopLocationTable)
				.where(eq(troopLocationTable.countryStateId, countryId));

			const logs = await db
				.select()
				.from(troopChangeLogTable)
				.where(eq(troopChangeLogTable.countryStateId, countryId));

			return {
				error: false as const,
				locations: locations.map((l) => ({
					...l,
					isHome: !!l.isHome,
					createdAt: l.createdAt,
					updatedAt: l.updatedAt,
				})),
				logs: logs.map((l) => ({
					...l,
					details: l.details ?? null,
					createdAt: l.createdAt,
				})),
			};
		},
		{
			params: t.Object({ gameId: t.String(), countryId: t.String() }),
			query: t.Object({ authorization: t.String() }),
			response: t.Union([
				t.Object({
					error: t.Literal(false),
					locations: t.Array(TroopLocationSchema),
					logs: t.Array(TroopChangeLogSchema),
				}),
				ErrorSchema,
			]),
			detail: {
				summary: "Get Troops",
				description:
					"Returns troop locations and change history for a country.",
				tags: ["Troops"],
			},
		},
	)
	.post(
		"/game/:gameId/country/:countryId/troops/purchase",
		async ({ params, body, query, set }) => {
			const countryId = Number.parseInt(params.countryId, 10);
			const gameId = Number.parseInt(params.gameId, 10);

			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));
			if (!user) {
				set.status = 401;
				return { error: true as const, message: "Unauthorized" };
			}

			const [country] = await db
				.select()
				.from(countryStateTable)
				.where(eq(countryStateTable.id, countryId));
			if (!country) {
				set.status = 404;
				return { error: true as const, message: "Country not found" };
			}
			if (
				user.country !== country.name &&
				user.country !== "Mods" &&
				user.role !== "admin"
			) {
				set.status = 403;
				return { error: true as const, message: "Unauthorized" };
			}

			// Validate purchase quantities are non-negative
			for (const tt of TROOP_TYPES) {
				if (body.quantities[tt] < 0) {
					set.status = 400;
					return {
						error: true as const,
						message: "Purchase quantities must be non-negative",
					};
				}
			}

			const totalPurchased = TROOP_TYPES.reduce(
				(sum, tt) => sum + body.quantities[tt],
				0,
			);
			if (totalPurchased === 0) {
				set.status = 400;
				return {
					error: true as const,
					message: "Must purchase at least one troop",
				};
			}

			const researchStates = await db
				.select()
				.from(researchStateTable)
				.where(eq(researchStateTable.countryStateId, countryId));
			const researchLevels = new Map(
				researchStates.map((state) => [state.researchType, state.level]),
			);
			if (
				body.quantities.submarines > 0 &&
				(researchLevels.get("submarineWarfare") ?? 0) < 1
			) {
				set.status = 400;
				return {
					error: true as const,
					message: "Submarine Warfare level 1 is required to build submarines",
				};
			}
			if (
				body.quantities.spies > 0 &&
				(researchLevels.get("spyEvade") ?? 0) < 1
			) {
				set.status = 400;
				return {
					error: true as const,
					message: "Spy Evade level 1 is required to recruit spies",
				};
			}

			// Compute total resource cost
			let totalOil = 0;
			let totalSteel = 0;
			let totalPopulation = 0;
			for (const tt of TROOP_TYPES) {
				const qty = body.quantities[tt];
				if (qty > 0) {
					totalOil += TROOP_COSTS[tt].oil * qty;
					totalSteel += TROOP_COSTS[tt].steel * qty;
					totalPopulation += TROOP_COSTS[tt].population * qty;
				}
			}

			// Check affordability (US has infinite oil)
			const isUS = country.name === "United States";
			const isRussia = country.name === "Russia";
			const createdAmount = (
				troopType: (typeof TROOP_TYPES)[number],
				amount: number,
			) => {
				const bonusLevel =
					troopType === "infantry"
						? (researchLevels.get("tankWarfare") ?? 0)
						: troopType === "navalShips"
							? (researchLevels.get("navalCombat") ?? 0)
							: troopType === "submarines"
								? Math.max(0, (researchLevels.get("submarineWarfare") ?? 0) - 1)
								: troopType === "fighters"
									? (researchLevels.get("dogfighting") ?? 0)
									: troopType === "bombers"
										? (researchLevels.get("bombing") ?? 0)
										: 0;
				const withResearch = Math.floor(amount * (1 + bonusLevel * 0.2));
				return isRussia ? withResearch * 2 : withResearch;
			};
			if (!isUS && country.oil < totalOil) {
				set.status = 400;
				return { error: true as const, message: "Not enough oil" };
			}
			if (country.steel < totalSteel) {
				set.status = 400;
				return { error: true as const, message: "Not enough steel" };
			}
			if (country.population < totalPopulation) {
				set.status = 400;
				return { error: true as const, message: "Not enough population" };
			}

			// Validate allocations sum to purchased quantities
			for (const tt of TROOP_TYPES) {
				const allocatedSum = body.allocations.reduce(
					(sum, a) => sum + a.troops[tt],
					0,
				);
				if (allocatedSum !== body.quantities[tt]) {
					set.status = 400;
					return {
						error: true as const,
						message: `Allocation for ${tt} (${allocatedSum}) does not match purchase quantity (${body.quantities[tt]})`,
					};
				}
			}

			// Validate allocation values are non-negative
			for (const alloc of body.allocations) {
				for (const tt of TROOP_TYPES) {
					if (alloc.troops[tt] < 0) {
						set.status = 400;
						return {
							error: true as const,
							message: "Allocation values must be non-negative",
						};
					}
				}
			}

			// Deduct resources
			const updateFields: Record<string, unknown> = {
				updatedAt: new Date(),
			};
			if (totalOil > 0) {
				updateFields.oil = sql`${countryStateTable.oil} - ${totalOil}`;
			}
			if (totalSteel > 0) {
				updateFields.steel = sql`${countryStateTable.steel} - ${totalSteel}`;
			}
			if (totalPopulation > 0) {
				updateFields.population = sql`${countryStateTable.population} - ${totalPopulation}`;
			}
			const [updatedCountry] = await db
				.update(countryStateTable)
				.set(updateFields)
				.where(eq(countryStateTable.id, countryId))
				.returning();

			// Log resource changes
			const resourceDeltas = [
				{ type: "oil" as const, delta: -totalOil, prev: country.oil },
				{ type: "steel" as const, delta: -totalSteel, prev: country.steel },
				{
					type: "population" as const,
					delta: -totalPopulation,
					prev: country.population,
				},
			];
			for (const { type, delta, prev } of resourceDeltas) {
				if (delta !== 0) {
					await db.insert(resourceChangeLogTable).values({
						countryStateId: countryId,
						gameId,
						resourceType: type,
						previousValue: prev,
						newValue: updatedCountry[type],
						note: "Troop purchase",
						changedBy: user.name,
						createdAt: new Date(),
					});
				}
			}

			// Upsert troop locations
			for (const alloc of body.allocations) {
				const hasTroops = TROOP_TYPES.some((tt) => alloc.troops[tt] > 0);
				if (!hasTroops) continue;

				const [existing] = await db
					.select()
					.from(troopLocationTable)
					.where(
						and(
							eq(troopLocationTable.countryStateId, countryId),
							eq(troopLocationTable.name, alloc.location),
						),
					);

				if (existing) {
					const locUpdate: Record<string, unknown> = {
						updatedAt: new Date(),
					};
					for (const tt of TROOP_TYPES) {
						const amount = createdAmount(tt, alloc.troops[tt]);
						if (amount > 0) {
							locUpdate[tt] = sql`${troopLocationTable[tt]} + ${amount}`;
						}
					}
					await db
						.update(troopLocationTable)
						.set(locUpdate)
						.where(eq(troopLocationTable.id, existing.id));
				} else {
					await db.insert(troopLocationTable).values({
						countryStateId: countryId,
						gameId,
						name: alloc.location,
						isHome: alloc.isHome,
						infantry: createdAmount("infantry", alloc.troops.infantry),
						navalShips: createdAmount("navalShips", alloc.troops.navalShips),
						aircraftCarriers: createdAmount(
							"aircraftCarriers",
							alloc.troops.aircraftCarriers,
						),
						fighters: createdAmount("fighters", alloc.troops.fighters),
						bombers: createdAmount("bombers", alloc.troops.bombers),
						spies: createdAmount("spies", alloc.troops.spies),
						submarines: createdAmount("submarines", alloc.troops.submarines),
						createdAt: new Date(),
						updatedAt: new Date(),
					});
				}
			}

			// Log purchase
			await db.insert(troopChangeLogTable).values({
				countryStateId: countryId,
				gameId,
				actionType: "purchase",
				infantry: createdAmount("infantry", body.quantities.infantry),
				navalShips: createdAmount("navalShips", body.quantities.navalShips),
				aircraftCarriers: createdAmount(
					"aircraftCarriers",
					body.quantities.aircraftCarriers,
				),
				fighters: createdAmount("fighters", body.quantities.fighters),
				bombers: createdAmount("bombers", body.quantities.bombers),
				spies: createdAmount("spies", body.quantities.spies),
				submarines: createdAmount("submarines", body.quantities.submarines),
				details: JSON.stringify(
					body.allocations.map((a) => ({
						location: a.location,
						isHome: a.isHome,
						troops: a.troops,
					})),
				),
				oilCost: totalOil,
				populationCost: totalPopulation,
				steelCost: totalSteel,
				changedBy: user.name,
				createdAt: new Date(),
			});

			// Broadcast updated resources
			const countryName = country.name as Country;
			app.server?.publish(
				`country:${countryName}`,
				JSON.stringify({
					type: "server.country.resources",
					country: countryName,
					resources: {
						oil: updatedCountry.oil,
						steel: updatedCountry.steel,
						population: updatedCountry.population,
					},
				}),
			);
			app.server?.publish(
				"country:Mods",
				JSON.stringify({
					type: "server.country.resources",
					country: countryName,
					resources: {
						oil: updatedCountry.oil,
						steel: updatedCountry.steel,
						population: updatedCountry.population,
					},
				}),
			);

			return { error: false as const };
		},
		{
			params: t.Object({ gameId: t.String(), countryId: t.String() }),
			query: t.Object({ authorization: t.String() }),
			body: t.Object({
				quantities: TroopCountsSchema,
				allocations: t.Array(
					t.Object({
						location: t.String(),
						isHome: t.Boolean(),
						troops: TroopCountsSchema,
					}),
				),
			}),
			response: t.Union([t.Object({ error: t.Literal(false) }), ErrorSchema]),
			detail: {
				summary: "Purchase Troops",
				description:
					"Purchases troops, deducts resources, and allocates to locations.",
				tags: ["Troops"],
			},
		},
	)
	.patch(
		"/game/:gameId/country/:countryId/troops/locations",
		async ({ params, body, query, set }) => {
			const countryId = Number.parseInt(params.countryId, 10);
			const gameId = Number.parseInt(params.gameId, 10);

			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));
			if (!user) {
				set.status = 401;
				return { error: true as const, message: "Unauthorized" };
			}

			const [country] = await db
				.select()
				.from(countryStateTable)
				.where(eq(countryStateTable.id, countryId));
			if (!country) {
				set.status = 404;
				return { error: true as const, message: "Country not found" };
			}
			if (user.country !== country.name && user.country !== "Mods") {
				set.status = 403;
				return { error: true as const, message: "Unauthorized" };
			}

			// Get current locations
			const currentLocations = await db
				.select()
				.from(troopLocationTable)
				.where(eq(troopLocationTable.countryStateId, countryId));
			const currentById = new Map(
				currentLocations.map((location) => [location.id, location]),
			);
			for (const location of body.locations) {
				if (location.id === undefined) continue;
				const existing = currentById.get(location.id);
				if (!existing || existing.name !== location.name) {
					set.status = 400;
					return {
						error: true as const,
						message:
							"Existing troop locations cannot be renamed. Create a movement to a new location instead.",
					};
				}
			}

			// Compute current totals per troop type
			const currentTotals: Record<string, number> = {};
			for (const tt of TROOP_TYPES) {
				currentTotals[tt] = currentLocations.reduce(
					(sum, loc) => sum + loc[tt],
					0,
				);
			}

			// Compute new totals from body
			const newTotals: Record<string, number> = {};
			for (const tt of TROOP_TYPES) {
				newTotals[tt] = body.locations.reduce(
					(sum, loc) => sum + loc.troops[tt],
					0,
				);
			}

			// Calculate losses (totals can decrease but not increase)
			let totalLosses = 0;
			const lossesPerType: Record<string, number> = {};
			for (const tt of TROOP_TYPES) {
				const loss = Math.max(0, currentTotals[tt] - newTotals[tt]);
				lossesPerType[tt] = loss;
				totalLosses += loss;
				if (newTotals[tt] > currentTotals[tt]) {
					set.status = 400;
					return {
						error: true as const,
						message: `Cannot add ${tt} here. Total ${tt} would increase from ${currentTotals[tt]} to ${newTotals[tt]}. Purchase troops instead.`,
					};
				}
			}

			// Validate all troop counts are non-negative
			for (const loc of body.locations) {
				for (const tt of TROOP_TYPES) {
					if (loc.troops[tt] < 0) {
						set.status = 400;
						return {
							error: true as const,
							message: "Troop counts cannot be negative",
						};
					}
				}
			}

			// Compute movement cost: sum of decreases at each location minus losses
			// (losses don't cost oil to move)
			let totalDecreases = 0;
			const currentByName = new Map(currentLocations.map((l) => [l.name, l]));
			for (const loc of body.locations) {
				const existing = currentByName.get(loc.name);
				if (existing) {
					for (const tt of TROOP_TYPES) {
						const diff = existing[tt] - loc.troops[tt];
						if (diff > 0) totalDecreases += diff;
					}
				}
			}
			const totalMoved = totalDecreases - totalLosses;

			// Check oil affordability for movement
			const isUS = country.name === "United States";
			if (!isUS && totalMoved > 0 && country.oil < totalMoved) {
				set.status = 400;
				return {
					error: true as const,
					message: `Not enough oil. Moving ${totalMoved} troops costs ${totalMoved} oil.`,
				};
			}

			// Deduct oil for movement
			if (totalMoved > 0) {
				const [updatedCountry] = await db
					.update(countryStateTable)
					.set({
						oil: sql`${countryStateTable.oil} - ${totalMoved}`,
						updatedAt: new Date(),
					})
					.where(eq(countryStateTable.id, countryId))
					.returning();

				await db.insert(resourceChangeLogTable).values({
					countryStateId: countryId,
					gameId,
					resourceType: "oil",
					previousValue: country.oil,
					newValue: updatedCountry.oil,
					note: `Troop movement (${totalMoved} troops moved)`,
					changedBy: user.name,
					createdAt: new Date(),
				});

				// Broadcast updated resources
				const countryName = country.name as Country;
				app.server?.publish(
					`country:${countryName}`,
					JSON.stringify({
						type: "server.country.resources",
						country: countryName,
						resources: {
							oil: updatedCountry.oil,
							steel: updatedCountry.steel,
							population: updatedCountry.population,
						},
					}),
				);
				app.server?.publish(
					"country:Mods",
					JSON.stringify({
						type: "server.country.resources",
						country: countryName,
						resources: {
							oil: updatedCountry.oil,
							steel: updatedCountry.steel,
							population: updatedCountry.population,
						},
					}),
				);
			}

			// Delete all existing locations and re-insert
			await db
				.delete(troopLocationTable)
				.where(eq(troopLocationTable.countryStateId, countryId));

			for (const loc of body.locations) {
				const hasTroops = TROOP_TYPES.some((tt) => loc.troops[tt] > 0);
				if (!hasTroops) continue;
				await db.insert(troopLocationTable).values({
					countryStateId: countryId,
					gameId,
					name: loc.name,
					isHome: loc.isHome,
					infantry: loc.troops.infantry,
					navalShips: loc.troops.navalShips,
					aircraftCarriers: loc.troops.aircraftCarriers,
					fighters: loc.troops.fighters,
					bombers: loc.troops.bombers,
					spies: loc.troops.spies,
					submarines: loc.troops.submarines,
					createdAt: new Date(),
					updatedAt: new Date(),
				});
			}

			// Log losses if any
			if (totalLosses > 0) {
				await db.insert(troopChangeLogTable).values({
					countryStateId: countryId,
					gameId,
					actionType: "loss",
					infantry: lossesPerType.infantry,
					navalShips: lossesPerType.navalShips,
					aircraftCarriers: lossesPerType.aircraftCarriers,
					fighters: lossesPerType.fighters,
					bombers: lossesPerType.bombers,
					spies: lossesPerType.spies,
					submarines: lossesPerType.submarines,
					details: null,
					oilCost: 0,
					populationCost: 0,
					steelCost: 0,
					changedBy: user.name,
					createdAt: new Date(),
				});
			}

			// Log movement if troops were actually moved
			if (totalMoved > 0) {
				// Compute per-type movement (only count decreases, not losses)
				const movementPerType: Record<string, number> = {};
				for (const tt of TROOP_TYPES) {
					let decreases = 0;
					for (const loc of body.locations) {
						const existing = currentByName.get(loc.name);
						if (existing) {
							const diff = existing[tt] - loc.troops[tt];
							if (diff > 0) decreases += diff;
						}
					}
					// Subtract losses from decreases to get actual movement
					movementPerType[tt] = Math.max(0, decreases - lossesPerType[tt]);
				}

				await db.insert(troopChangeLogTable).values({
					countryStateId: countryId,
					gameId,
					actionType: "movement",
					infantry: movementPerType.infantry,
					navalShips: movementPerType.navalShips,
					aircraftCarriers: movementPerType.aircraftCarriers,
					fighters: movementPerType.fighters,
					bombers: movementPerType.bombers,
					spies: movementPerType.spies,
					submarines: movementPerType.submarines,
					details: JSON.stringify(
						body.locations.map((l) => ({
							location: l.name,
							isHome: l.isHome,
							troops: l.troops,
						})),
					),
					oilCost: totalMoved,
					populationCost: 0,
					steelCost: 0,
					changedBy: user.name,
					createdAt: new Date(),
				});
			}

			return { error: false as const };
		},
		{
			params: t.Object({ gameId: t.String(), countryId: t.String() }),
			query: t.Object({ authorization: t.String() }),
			body: t.Object({
				locations: t.Array(
					t.Object({
						id: t.Optional(t.Number()),
						name: t.String(),
						isHome: t.Boolean(),
						troops: TroopCountsSchema,
					}),
				),
			}),
			response: t.Union([t.Object({ error: t.Literal(false) }), ErrorSchema]),
			detail: {
				summary: "Update Troop Locations",
				description:
					"Moves troops between locations. Totals must remain the same. Costs 1 oil per troop moved.",
				tags: ["Troops"],
			},
		},
	)
	.patch(
		"/game/:gameId/stop",
		async ({ params, query, set }) => {
			// Check if user is admin
			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));

			if (!user || (user.role !== "admin" && user.country !== "Mods")) {
				set.status = 403;
				return {
					error: true as const,
					message: "Only admins and mods can stop games",
				};
			}

			const gameId = Number.parseInt(params.gameId, 10);

			// Check if game exists
			const [game] = await db
				.select()
				.from(gamesTable)
				.where(eq(gamesTable.id, gameId));

			if (!game) {
				set.status = 404;
				return { error: true as const, message: "Game not found" };
			}

			// Update game status to finished
			await db
				.update(gamesTable)
				.set({ status: "finished" })
				.where(eq(gamesTable.id, gameId));

			// Clear any scheduled year changes for this game
			yearScheduler.clearGameSchedules(gameId);

			// Broadcast game ended to all clients
			app.server?.publish(
				"global",
				JSON.stringify({
					type: "server.game.ended",
				}),
			);

			return {
				error: false as const,
				message: "Game stopped successfully",
			};
		},
		{
			params: t.Object({
				gameId: t.String(),
			}),
			response: t.Union([
				t.Object({
					error: t.Literal(false),
					message: t.String(),
				}),
				ErrorSchema,
			]),
			detail: {
				summary: "Stop Game",
				description: "Sets the game status to 'finished' (admin only).",
				tags: ["Game"],
			},
		},
	)
	.patch(
		"/game/:gameId/pause",
		async ({ params, query, set }) => {
			// Check if user is admin or mod
			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));

			if (!user || (user.role !== "admin" && user.country !== "Mods")) {
				set.status = 403;
				return {
					error: true as const,
					message: "Only admins and mods can pause games",
				};
			}

			const gameId = Number.parseInt(params.gameId, 10);

			// Check if game exists
			const [game] = await db
				.select()
				.from(gamesTable)
				.where(eq(gamesTable.id, gameId));

			if (!game) {
				set.status = 404;
				return { error: true as const, message: "Game not found" };
			}

			// Update game status to paused
			await db
				.update(gamesTable)
				.set({ status: "paused" })
				.where(eq(gamesTable.id, gameId));

			// Clear any scheduled year changes for this game
			yearScheduler.clearGameSchedules(gameId);

			// Broadcast game paused to all clients
			app.server?.publish(
				"global",
				JSON.stringify({
					type: "server.game.paused",
				}),
			);

			return {
				error: false as const,
				message: "Game paused successfully",
			};
		},
		{
			params: t.Object({
				gameId: t.String(),
			}),
			response: t.Union([
				t.Object({
					error: t.Literal(false),
					message: t.String(),
				}),
				ErrorSchema,
			]),
			detail: {
				summary: "Pause Game",
				description: "Sets the game status to 'paused' (admin/mod only).",
				tags: ["Game"],
			},
		},
	)
	.patch(
		"/game/:gameId/unpause",
		async ({ params, query, set }) => {
			// Check if user is admin or mod
			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));

			if (!user || (user.role !== "admin" && user.country !== "Mods")) {
				set.status = 403;
				return {
					error: true as const,
					message: "Only admins and mods can unpause games",
				};
			}

			const gameId = Number.parseInt(params.gameId, 10);

			// Check if game exists and is paused
			const [game] = await db
				.select()
				.from(gamesTable)
				.where(eq(gamesTable.id, gameId));

			if (!game) {
				set.status = 404;
				return { error: true as const, message: "Game not found" };
			}

			if (game.status !== "paused") {
				set.status = 400;
				return {
					error: true as const,
					message: "Game is not currently paused",
				};
			}

			// Update game status to active
			await db
				.update(gamesTable)
				.set({ status: "active" })
				.where(eq(gamesTable.id, gameId));

			// Reschedule year changes for this game
			await yearScheduler.scheduleGameYears(gameId);

			// Broadcast game unpaused to all clients
			app.server?.publish(
				"global",
				JSON.stringify({
					type: "server.game.unpaused",
				}),
			);

			return {
				error: false as const,
				message: "Game unpaused successfully",
			};
		},
		{
			params: t.Object({
				gameId: t.String(),
			}),
			response: t.Union([
				t.Object({
					error: t.Literal(false),
					message: t.String(),
				}),
				ErrorSchema,
			]),
			detail: {
				summary: "Unpause Game",
				description:
					"Sets the game status back to 'active' and resumes year scheduling (admin/mod only).",
				tags: ["Game"],
			},
		},
	)
	// Announcements endpoints
	.post(
		"/game/:gameId/announcements",
		async ({ params, body, query, set }) => {
			const gameId = Number.parseInt(params.gameId, 10);

			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));

			if (!user || !user.country) {
				set.status = 401;
				return {
					error: true as const,
					message: "You must be assigned to a country",
				};
			}
			const currentYear = await yearScheduler.getCurrentYear(gameId);
			const isMod = user.country === "Mods" || user.role === "admin";
			if (!isMod) {
				const existingCountryAnnouncements = await db
					.select({ id: announcementsTable.id })
					.from(announcementsTable)
					.where(
						and(
							eq(announcementsTable.gameId, gameId),
							eq(
								announcementsTable.authorCountry,
								user.country as PlayableCountry,
							),
							eq(announcementsTable.kind, "country"),
							eq(announcementsTable.year, currentYear),
						),
					);
				if (existingCountryAnnouncements.length >= 3) {
					set.status = 429;
					return {
						error: true as const,
						message: "Countries may publish three announcements per year",
					};
				}
			}

			// Create the announcement
			const [announcement] = await db
				.insert(announcementsTable)
				.values({
					gameId,
					content: body.content,
					kind: isMod ? "psa" : "country",
					authorCountry: isMod ? null : (user.country as PlayableCountry),
					year: currentYear,
					targetCountries: isMod ? (body.targetCountries ?? null) : null,
					createdBy: user.id,
					createdAt: new Date(),
				})
				.returning();

			const announcementData = {
				id: announcement.id,
				gameId: announcement.gameId,
				content: announcement.content,
				kind: announcement.kind,
				authorCountry: announcement.authorCountry,
				year: announcement.year,
				targetCountries: announcement.targetCountries as
					| PlayableCountry[]
					| null,
				createdBy: user.name,
				createdAt: announcement.createdAt,
			};

			// Broadcast to relevant country rooms or global
			const wsMessage = JSON.stringify({
				type: "server.announcement",
				announcement: announcementData,
			});

			if (isMod && body.targetCountries && body.targetCountries.length > 0) {
				// Send to specific country rooms
				for (const country of body.targetCountries) {
					app.server?.publish(`country:${country}`, wsMessage);
				}
				// Also send to mods room so they can see it
				app.server?.publish("country:Mods", wsMessage);
			} else {
				// Send to everyone (global)
				app.server?.publish("global", wsMessage);
			}

			return {
				error: false as const,
				announcement: announcementData,
			};
		},
		{
			params: t.Object({
				gameId: t.String(),
			}),
			body: t.Object({
				content: t.String(),
				targetCountries: t.Optional(t.Array(PlayableCountrySchema)),
			}),
			response: t.Union([
				t.Object({
					error: t.Literal(false),
					announcement: AnnouncementSchema,
				}),
				ErrorSchema,
			]),
			detail: {
				summary: "Create Announcement",
				description:
					"Creates a moderator PSA or a country announcement (three per country per year).",
				tags: ["Announcements"],
			},
		},
	)
	.post(
		"/game/:gameId/mod-request",
		async ({ params, query, set }) => {
			const gameId = Number.parseInt(params.gameId, 10);
			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));

			if (!user || !user.country || user.country === "Mods") {
				set.status = 403;
				return {
					error: true as const,
					message: "Only players can call a moderator",
				};
			}

			const [country] = await db
				.select()
				.from(countryStateTable)
				.where(
					and(
						eq(countryStateTable.gameId, gameId),
						eq(countryStateTable.name, user.country),
					),
				);
			if (!country) {
				set.status = 404;
				return { error: true as const, message: "Country state not found" };
			}

			const [request] = await db
				.insert(actionRequestTable)
				.values({
					gameId,
					countryStateId: country.id,
					type: "general",
					title: "Moderator requested",
					description: `${user.country} requested a moderator at their table.`,
					status: "pending",
					createdBy: user.id,
					createdAt: new Date(),
					updatedAt: new Date(),
				})
				.returning();

			const announcementData = {
				id: request.id,
				gameId: request.gameId,
				content: `[MOD REQUEST] ${user.country}`,
				kind: "country" as const,
				authorCountry: user.country as PlayableCountry,
				year: await yearScheduler.getCurrentYear(gameId),
				targetCountries: [] as PlayableCountry[],
				createdBy: user.name,
				createdAt: request.createdAt,
			};

			app.server?.publish(
				"country:Mods",
				JSON.stringify({
					type: "server.announcement",
					announcement: announcementData,
				}),
			);

			return {
				error: false as const,
				announcement: announcementData,
			};
		},
		{
			params: t.Object({
				gameId: t.String(),
			}),
			response: t.Union([
				t.Object({
					error: t.Literal(false),
					announcement: AnnouncementSchema,
				}),
				ErrorSchema,
			]),
			detail: {
				summary: "Call Moderator",
				description: "Creates a moderator request announcement (players only).",
				tags: ["Announcements"],
			},
		},
	)
	.get(
		"/game/:gameId/announcements",
		async ({ params, query }) => {
			const gameId = Number.parseInt(params.gameId, 10);

			// Get the user to determine which announcements they can see
			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));

			const userCountry = user?.country as Country | null;
			const isMod = userCountry === "Mods" || user?.role === "admin";

			// Get all announcements for this game
			const announcements = await db
				.select({
					id: announcementsTable.id,
					gameId: announcementsTable.gameId,
					content: announcementsTable.content,
					kind: announcementsTable.kind,
					authorCountry: announcementsTable.authorCountry,
					year: announcementsTable.year,
					targetCountries: announcementsTable.targetCountries,
					createdBy: usersTable.name,
					createdAt: announcementsTable.createdAt,
				})
				.from(announcementsTable)
				.leftJoin(usersTable, eq(announcementsTable.createdBy, usersTable.id))
				.where(eq(announcementsTable.gameId, gameId))
				.orderBy(sql`${announcementsTable.createdAt} DESC`);

			// Filter announcements based on user's country (mods see all)
			const filteredAnnouncements = announcements.filter((announcement) => {
				if (isMod) return true;
				if (!announcement.targetCountries) return true; // null = everyone
				const targets = announcement.targetCountries as PlayableCountry[];
				return userCountry && targets.includes(userCountry as PlayableCountry);
			});

			return {
				error: false as const,
				announcements: filteredAnnouncements.map((a) => ({
					id: a.id,
					gameId: a.gameId,
					content: a.content,
					kind: a.kind,
					authorCountry: a.authorCountry,
					year: a.year,
					targetCountries: a.targetCountries as PlayableCountry[] | null,
					createdBy: a.createdBy ?? "Unknown",
					createdAt: a.createdAt,
				})),
			};
		},
		{
			params: t.Object({
				gameId: t.String(),
			}),
			response: t.Union([
				t.Object({
					error: t.Literal(false),
					announcements: t.Array(AnnouncementSchema),
				}),
				ErrorSchema,
			]),
			detail: {
				summary: "Get Announcements",
				description: "Returns announcements visible to the user.",
				tags: ["Announcements"],
			},
		},
	)
	.get(
		"/game/:gameId/announcement-replies",
		async ({ params, query, set }) => {
			const gameId = Number.parseInt(params.gameId, 10);
			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));
			if (!user) {
				set.status = 401;
				return { error: true as const, message: "Unauthorized" };
			}
			const rows = await db
				.select({
					id: announcementRepliesTable.id,
					announcementId: announcementRepliesTable.announcementId,
					gameId: announcementRepliesTable.gameId,
					content: announcementRepliesTable.content,
					createdBy: usersTable.name,
					authorCountry: announcementRepliesTable.authorCountry,
					createdAt: announcementRepliesTable.createdAt,
					targetCountries: announcementsTable.targetCountries,
				})
				.from(announcementRepliesTable)
				.innerJoin(
					announcementsTable,
					eq(announcementRepliesTable.announcementId, announcementsTable.id),
				)
				.leftJoin(
					usersTable,
					eq(announcementRepliesTable.createdBy, usersTable.id),
				)
				.where(eq(announcementRepliesTable.gameId, gameId))
				.orderBy(announcementRepliesTable.createdAt);

			const replies = rows
				.filter((row) => {
					if (user.country === "Mods") return true;
					if (!row.targetCountries) return true;
					return row.targetCountries.includes(user.country as PlayableCountry);
				})
				.map(({ targetCountries: _targetCountries, ...reply }) => ({
					...reply,
					createdBy: reply.createdBy ?? "Unknown",
					authorCountry: reply.authorCountry as Country,
				}));
			return { error: false as const, replies };
		},
		{
			params: t.Object({ gameId: t.String() }),
			response: t.Union([
				t.Object({
					error: t.Literal(false),
					replies: t.Array(AnnouncementReplySchema),
				}),
				ErrorSchema,
			]),
		},
	)
	.post(
		"/game/:gameId/announcements/:announcementId/replies",
		async ({ params, query, body, set }) => {
			const gameId = Number.parseInt(params.gameId, 10);
			const announcementId = Number.parseInt(params.announcementId, 10);
			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));
			if (!user?.country) {
				set.status = 401;
				return { error: true as const, message: "Unauthorized" };
			}
			const [announcement] = await db
				.select()
				.from(announcementsTable)
				.where(
					and(
						eq(announcementsTable.id, announcementId),
						eq(announcementsTable.gameId, gameId),
					),
				);
			if (!announcement) {
				set.status = 404;
				return { error: true as const, message: "Announcement not found" };
			}
			const targets = announcement.targetCountries as PlayableCountry[] | null;
			if (
				user.country !== "Mods" &&
				targets &&
				!targets.includes(user.country as PlayableCountry)
			) {
				set.status = 403;
				return { error: true as const, message: "Announcement is not visible" };
			}
			const content = body.content.trim();
			if (!content || content.length > 1000) {
				set.status = 400;
				return {
					error: true as const,
					message: "Replies must be between 1 and 1,000 characters",
				};
			}
			const [reply] = await db
				.insert(announcementRepliesTable)
				.values({
					announcementId,
					gameId,
					content,
					createdBy: user.id,
					authorCountry: user.country,
					createdAt: new Date(),
				})
				.returning();
			return {
				error: false as const,
				reply: { ...reply, createdBy: user.name, authorCountry: user.country },
			};
		},
		{
			params: t.Object({ gameId: t.String(), announcementId: t.String() }),
			body: t.Object({ content: t.String() }),
			response: t.Union([
				t.Object({
					error: t.Literal(false),
					reply: AnnouncementReplySchema,
				}),
				ErrorSchema,
			]),
		},
	)
	.delete(
		"/game/:gameId/announcements/:announcementId",
		async ({ params, query, set }) => {
			const gameId = Number.parseInt(params.gameId, 10);
			const announcementId = Number.parseInt(params.announcementId, 10);

			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));

			if (!user || (user.role !== "admin" && user.country !== "Mods")) {
				set.status = 403;
				return {
					error: true as const,
					message: "Only admins and mods can delete announcements",
				};
			}

			const [deleted] = await db
				.delete(announcementsTable)
				.where(
					and(
						eq(announcementsTable.id, announcementId),
						eq(announcementsTable.gameId, gameId),
					),
				)
				.returning({
					id: announcementsTable.id,
				});

			if (!deleted) {
				set.status = 404;
				return {
					error: true as const,
					message: "Announcement not found",
				};
			}

			return {
				error: false as const,
				message: "Announcement deleted successfully",
			};
		},
		{
			params: t.Object({
				gameId: t.String(),
				announcementId: t.String(),
			}),
			response: t.Union([
				t.Object({
					error: t.Literal(false),
					message: t.String(),
				}),
				ErrorSchema,
			]),
			detail: {
				summary: "Delete Announcement",
				description: "Deletes an announcement (admin/mod only).",
				tags: ["Announcements"],
			},
		},
	)
	.listen(3001);

// Set the app instance in the year scheduler so it can publish WebSocket messages
yearScheduler.setApp(app);

// Initialize year scheduler for any active games on server start
yearScheduler.initializeActiveGames().catch((err) => {
	console.error("Failed to initialize year scheduler:", err);
});

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
