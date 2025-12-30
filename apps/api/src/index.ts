import { cors } from "@elysiajs/cors";
import { fromTypes, openapi } from "@elysiajs/openapi";
import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import packageJson from "../package.json";
import { db } from "./db";
import { usersTable } from "./db/schema";
import * as schema from "./schema";

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
	.get("/ping", () => `Pong`, {
		detail: {
			summary: "Health Check",
			description: "Returns 'Pong' to verify the server is alive.",
			tags: ["Utility"],
		},
	})
	// Public user lookup endpoint for authentication
	.get(
		"/user-exist/:id",
		async ({ params, set }) => {
			const [user] = await db
				.select({ name: usersTable.name })
				.from(usersTable)
				.where(eq(usersTable.id, params.id));

			if (!user) {
				set.status = 404;
				return { type: "server.error", message: "User not found" };
			}

			return { type: "server.userExist", name: user.name };
		},
		{
			response: t.Union([
				t.Object({
					type: t.Literal("server.userExist"),
					name: t.String(),
				}),
				t.Object({
					type: t.Literal("server.error"),
					message: t.String(),
				}),
			]),
			params: t.Object({
				id: t.String(),
			}),
			detail: {
				summary: "Get User by ID",
				description:
					"Checks if a user exists for authentication. Returns their name if found.",
				tags: ["User"],
			},
		},
	)
	// Websocket
	.ws("/ws", {
		body: schema.ClientMessageSchema,
		response: schema.ServerMessageSchema,
		open(ws) {
			console.log(`User Connected`);
			ws.send({
				type: "server.connected",
				apiVersion: packageJson.version,
			});
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
			console.log("extra");
		},
		close(ws) {
			ws.unsubscribe("global");
		},
	})
	// API
	.guard({
		headers: t.Object({
			authorization: t.String(),
		}),
	})
	.onBeforeHandle(async ({ headers, set }) => {
		const authHeader = headers.authorization;

		if (!authHeader) {
			set.status = 401;
			return { message: "Missing or invalid Authorization header" };
		}

		const user = await db
			.select()
			.from(usersTable)
			.where((table) => eq(table.id, authHeader));

		if (user.length === 0) {
			set.status = 401;
			return { message: "Missing or invalid Authorization header" };
		}
	})
	.get(
		"/users",
		async () => {
			const users = await db.select().from(usersTable);
			return users;
		},
		{
			detail: {
				summary: "List Users",
				description: "Returns all users.",
				tags: ["User"],
			},
		},
	)
	.get(
		"/users/:id",
		async ({ params, set }) => {
			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, params.id));

			if (!user) {
				set.status = 404;
				return { type: "server.error", message: "User not found" };
			}

			return { type: "server.user", user: user };
		},
		{
			response: schema.ServerMessageSchema,
			params: t.Object({
				id: t.String(),
			}),
			detail: {
				summary: "Get User by ID",
				description: "Returns a single user by their ID.",
				tags: ["User"],
			},
		},
	)
	.post(
		"/users",
		async ({ body }) => {
			console.log(`Creating user ${body.name}`);
			const [newUser] = await db.insert(usersTable).values(body).returning();
			return newUser;
		},
		{
			body: t.Object({
				username: t.String(),
				name: t.String(),
				email: t.String(),
				role: t.String(),
			}),
			detail: {
				summary: "Create User",
				description: "Creates a new user in the database.",
				tags: ["User"],
			},
		},
	)
	.listen(3001);

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
