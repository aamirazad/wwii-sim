import { cors } from "@elysiajs/cors";
import { fromTypes, openapi } from "@elysiajs/openapi";
import { eq, or } from "drizzle-orm";
import { Elysia, t } from "elysia";
import packageJson from "../package.json";
import { db } from "./db";
import {
	COUNTRIES,
	type Country,
	countryStateTable,
	type GameStatus,
	gamesTable,
	resourceChangeLogTable,
	type UserRole,
	usersTable,
} from "./db/schema";
import {
	CountryStateSchema,
	CreateGameBodySchema,
	ErrorSchema,
	GameSchema,
	ResourceChangeLogSchema,
	UserRoleSchema,
	UserSchema,
	type YearDurations,
} from "./schema";

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
			origin: process.env.CORS_ORIGIN,
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

			return {
				error: false as const,
				user: {
					id: user.id,
					username: user.username,
					name: user.name,
					role: user.role as UserRole,
				},
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
	// // Websocket
	// .ws("/ws", {
	// 	body: schema.ClientMessageSchema,
	// 	response: schema.ServerMessageSchema,
	// 	open(ws) {
	// 		console.log(`User Connected`);
	// 		ws.send({
	// 			type: "server.connected",
	// 			apiVersion: packageJson.version,
	// 		});
	// 	},
	// 	async message(ws, message) {
	// 		const [authenticatedUser] = await db
	// 			.select()
	// 			.from(usersTable)
	// 			.where((table) => eq(table.id, message.token));

	// 		if (!authenticatedUser) {
	// 			ws.send({
	// 				type: "server.error",
	// 				message: "Missing or invalid Authorization header",
	// 			});
	// 			return;
	// 		}
	// 		console.log("extra");
	// 	},
	// 	close(ws) {
	// 		ws.unsubscribe("global");
	// 	},
	// })
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
			return users.map((user) => ({
				id: user.id,
				username: user.username,
				name: user.name,
				email: user.email,
				role: user.role as UserRole,
				createdAt: user.createdAt,
			}));
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

			return {
				exists: true as const,
				game: {
					id: game.id,
					status: game.status as GameStatus,
					startDate: game.startDate,
					yearDurations: game.yearDurations as YearDurations,
					createdAt: game.createdAt,
				},
			};
		},
		{
			response: t.Object({
				exists: t.Boolean(),
				game: t.Optional(GameSchema),
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

			// Create country states for all countries
			const countryStates = [];
			for (const countryName of COUNTRIES) {
				const countryConfig = body.countries[countryName];
				const [countryState] = await db
					.insert(countryStateTable)
					.values({
						name: countryName,
						gameId: newGame.id,
						players: countryConfig.players,
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
					if (countryConfig[resourceType] > 0) {
						await db.insert(resourceChangeLogTable).values({
							countryStateId: countryState.id,
							gameId: newGame.id,
							resourceType,
							previousValue: 0,
							newValue: countryConfig[resourceType],
							note: "Initial game setup",
							changedBy: query.authorization,
							createdAt: new Date(),
						});
					}
				}

				countryStates.push({
					id: countryState.id,
					name: countryState.name as Country,
					gameId: countryState.gameId,
					players: countryState.players || [],
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
					players: c.players || [],
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

			// Log changes for each resource that was modified
			const updates: Partial<{
				oil: number;
				steel: number;
				population: number;
			}> = {};
			const resources = ["oil", "steel", "population"] as const;

			for (const resourceType of resources) {
				if (
					body[resourceType] !== undefined &&
					body[resourceType] !== country[resourceType]
				) {
					// Log the change
					await db.insert(resourceChangeLogTable).values({
						countryStateId: countryId,
						gameId,
						resourceType,
						previousValue: country[resourceType],
						newValue: body[resourceType],
						note: body.note,
						changedBy: query.authorization,
						createdAt: new Date(),
					});
					updates[resourceType] = body[resourceType];
				}
			}

			// Update the country state
			if (Object.keys(updates).length > 0) {
				await db
					.update(countryStateTable)
					.set({ ...updates, updatedAt: new Date() })
					.where(eq(countryStateTable.id, countryId));
			}

			// Get updated country
			const [updatedCountry] = await db
				.select()
				.from(countryStateTable)
				.where(eq(countryStateTable.id, countryId));

			return {
				error: false as const,
				country: {
					id: updatedCountry.id,
					name: updatedCountry.name as Country,
					gameId: updatedCountry.gameId,
					players: updatedCountry.players || [],
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
				oil: t.Optional(t.Number()),
				steel: t.Optional(t.Number()),
				population: t.Optional(t.Number()),
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
	.listen(3001);

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
