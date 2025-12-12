import { Elysia } from "elysia";
import packageJson from "../package.json";
import type { ClientMessage, ServerMessage } from "./ws-events";

let counter = 0;

const app = new Elysia()
	.get("/", () => "Hello Elysia")
	.get("/ping", () => "Pong")
	.ws("/ws", {
		open(ws) {
			ws.subscribe("global");
			const msg: ServerMessage = {
				type: "server:connected",
				apiVersion: packageJson.version,
				counter,
			};
			ws.send(msg);
		},
		message(ws, message) {
			const msg = message as unknown as ClientMessage;
			if (msg.type === "client:counter:increment") {
				counter++;
				const update: ServerMessage = {
					type: "server:counter",
					counter,
				};
				ws.publish("global", update);
				ws.send(update);
			}
		},
		close(ws) {
			ws.unsubscribe("global");
		},
	})
	.listen(3001);

setInterval(() => {
	const msg: ServerMessage = {
		type: "server:time",
		time: new Date().toISOString(),
	};
	// app.server.publish requires string for raw Bun server, but Elysia might wrap it.
	// To be safe and consistent with ws.send(obj) which stringifies, we should stringify here
	// IF ws.send(obj) stringifies.
	// Elysia WS automatically parses/stringifies JSON.
	// However, app.server.publish is the raw Bun publish.
	// So we must stringify it manually.
	app.server?.publish("global", JSON.stringify(msg));
}, 6000);

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
