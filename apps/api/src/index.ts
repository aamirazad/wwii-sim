import { cors } from "@elysiajs/cors";
import { fromTypes, openapi } from "@elysiajs/openapi";
import { eq, or } from "drizzle-orm";
import { Elysia, t } from "elysia";
import packageJson from "../package.json";
import { db } from "./db";
import {
	type GameStatus,
	gamesTable,
	type UserRole,
	usersTable,
} from "./db/schema";
import { ErrorSchema, GameSchema, UserRoleSchema, UserSchema } from "./schema";

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
					createdAt: user.createdAt,
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
					startTime: game.startTime,
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
		async ({ query, set }) => {
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

			const [newGame] = await db
				.insert(gamesTable)
				.values({ status: "waiting" })
				.returning();

			return {
				error: false as const,
				game: {
					id: newGame.id,
					status: newGame.status as GameStatus,
					startTime: newGame.startTime,
					createdAt: newGame.createdAt,
				},
			};
		},
		{
			response: t.Union([
				t.Object({
					error: t.Literal(false),
					game: GameSchema,
				}),
				ErrorSchema,
			]),
			detail: {
				summary: "Create Game",
				description: "Creates a new game (admin only).",
				tags: ["Game"],
			},
		},
	)
	.listen(3001);

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
