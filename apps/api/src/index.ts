import { cors } from "@elysiajs/cors";
import { fromTypes, openapi } from "@elysiajs/openapi";
import { and, eq, or, sql } from "drizzle-orm";
import { Elysia, t } from "elysia";
import packageJson from "../package.json";
import { db } from "./db";
import {
	announcementsTable,
	type Country,
	countryStateTable,
	type GameStatus,
	gameStateTable,
	gamesTable,
	PLAYABLE_COUNTRIES,
	type PlayableCountry,
	resourceChangeLogTable,
	type UserRole,
	usersTable,
} from "./db/schema";
import {
	AnnouncementSchema,
	ClientMessageSchema,
	CountrySchema,
	CountryStateSchema,
	CreateGameBodySchema,
	ErrorSchema,
	ExtendedGameSchema,
	GameSchema,
	PlayableCountrySchema,
	ResourceChangeLogSchema,
	ServerMessageSchema,
	UserRoleSchema,
	UserSchema,
	type YearDurations,
} from "./schema";
import { yearScheduler } from "./services/year-scheduler";

const app = new Elysia()
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
			origin:
				/^(?:https?:\/\/)?(?:sim\.aamirazad\.com|[A-Za-z0-9-]+-aamira\.vercel\.app|localhost:3000)(?:\/.*)?$/,
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
			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, params.id));

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
		body: ClientMessageSchema,
		response: ServerMessageSchema,
		open(ws) {
			console.log(`User Connected`);
			ws.send({
				type: "server.connected",
				apiVersion: packageJson.version,
			});
			ws.subscribe("global");
		},
		async message(ws, message) {
			const [authenticatedUser] = await db
				.select()
				.from(usersTable)
				.where((table) => eq(table.id, message.token));

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

		const user = await db
			.select()
			.from(usersTable)
			.where(eq(usersTable.id, authHeader));

		if (user.length === 0) {
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
			console.log(`Creating user ${body.name}`);
			const [newUser] = await db.insert(usersTable).values(body).returning();
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
				country: t.Optional(CountrySchema),
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

			if (user.role !== "admin") {
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

			// Create the game with new fields
			const [newGame] = await db
				.insert(gamesTable)
				.values({
					status: "waiting",
					startDate: new Date(body.startDate),
					yearDurations: body.yearDurations,
				})
				.returning();

			// Initialize game state
			await db.insert(gameStateTable).values({
				gameId: newGame.id,
				currentYear: 1938,
			});

			// Initialize year schedules from year durations
			await yearScheduler.initializeGameSchedulesFromDurations(
				newGame.id,
				query.authorization,
			);

			// Create country states for all playable countries (not "Mods")
			const countryStates = [];
			for (const countryName of PLAYABLE_COUNTRIES) {
				const countryConfig = body.countries[countryName];
				const [countryState] = await db
					.insert(countryStateTable)
					.values({
						name: countryName,
						gameId: newGame.id,
						oil: countryConfig.oil,
						steel: countryConfig.steel,
						population: countryConfig.population,
						createdAt: new Date(),
						updatedAt: new Date(),
					})
					.returning();

				// Log initial resource values
				const resources = ["oil", "steel", "population"] as const;
				for (const resourceType of resources) {
					await db.insert(resourceChangeLogTable).values({
						countryStateId: countryState.id,
						gameId: newGame.id,
						resourceType,
						previousValue: 0,
						newValue: countryConfig[resourceType],
						note: "Starting amount",
						changedBy: "system",
						createdAt: new Date(),
					});
				}

				countryStates.push({
					id: countryState.id,
					name: countryState.name as Country,
					gameId: countryState.gameId,
					oil: countryState.oil,
					steel: countryState.steel,
					population: countryState.population,
					createdAt: countryState.createdAt,
					updatedAt: countryState.updatedAt,
				});
			}

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

			if (user.country !== country.name && user.country !== "Mods") {
				set.status = 403;
				return { error: true as const, message: "Unauthorized" };
			}

			const isMod = user.country === "Mods";

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

			// Check if user is a mod
			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, query.authorization));

			if (!user || user.country !== "Mods") {
				set.status = 403;
				return {
					error: true as const,
					message: "Only moderators can create announcements",
				};
			}

			// Create the announcement
			const [announcement] = await db
				.insert(announcementsTable)
				.values({
					gameId,
					content: body.content,
					targetCountries: body.targetCountries ?? null,
					createdBy: user.id,
					createdAt: new Date(),
				})
				.returning();

			const announcementData = {
				id: announcement.id,
				gameId: announcement.gameId,
				content: announcement.content,
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

			if (body.targetCountries && body.targetCountries.length > 0) {
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
				description: "Creates a new announcement (mod only).",
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
			const isMod = userCountry === "Mods";

			// Get all announcements for this game
			const announcements = await db
				.select({
					id: announcementsTable.id,
					gameId: announcementsTable.gameId,
					content: announcementsTable.content,
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
