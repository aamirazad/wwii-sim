import { Elysia } from "elysia";

const app = new Elysia()
	.get("/", () => "Hello Elysia")
	.get("/ping", () => "Pong")
	.ws("/ws", {
		message(ws, message) {
			ws.send(message);
		},
	})
	.listen(3001);

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
