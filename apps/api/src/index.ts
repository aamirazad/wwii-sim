import { Elysia } from "elysia";
import packageJson from "../package.json";
import {
	type ClientMessage,
	COUNTRIES,
	type Country,
	type ServerMessage,
} from "./ws-events";

let counter = 0;

// In-memory state for countries
const countryState: Record<
	Country,
	{ oil: number; steel: number; population: number }
> = {
	Commonwealth: { oil: 10, steel: 10, population: 10 },
	France: { oil: 10, steel: 10, population: 10 },
	Germany: { oil: 10, steel: 10, population: 10 },
	Italy: { oil: 10, steel: 10, population: 10 },
	Japan: { oil: 10, steel: 10, population: 10 },
	Russia: { oil: 10, steel: 10, population: 10 },
	UK: { oil: 10, steel: 10, population: 10 },
	USA: { oil: 10, steel: 10, population: 10 },
};

const app = new Elysia()
	.get("/", () => "Hello Elysia")
	.get("/ping", () => "Pong")
	.ws("/ws", {
		open(ws) {
			ws.subscribe("global");
			const msg: ServerMessage = {
				type: "server.connected",
				apiVersion: packageJson.version,
				counter,
			};
			ws.send(msg);
		},
		message(ws, message: ClientMessage) {
			const msg = message;
			switch (msg.type) {
				case "client.counter.increment": {
					counter++;
					const update: ServerMessage = {
						type: "server.counter",
						counter,
					};
					ws.publish("global", update);
					ws.send(update);
					break;
				}
				case "client.game.set_time_offset": {
					scheduleNewYear(msg.seconds);
					console.log(`schedule ${msg.seconds}`);
					break;
				}
				case "client.join_country": {
					const { country, username } = msg;
					if (COUNTRIES.includes(country as Country)) {
						ws.subscribe(`country.${country}`);
						console.log(`${username} joined ${country}`);
						const stateMsg: ServerMessage = {
							type: "server.country_state",
							country,
							resources: countryState[country as Country],
						};
						ws.send(stateMsg);
					}
					break;
				}
				case "client.update_resource": {
					const { country, resource, value } = msg;
					if (
						COUNTRIES.includes(country as Country) &&
						["oil", "steel", "population"].includes(resource)
					) {
						const c = country as Country;
						// @ts-expect-error
						countryState[c][resource] = value;
						const updateMsg: ServerMessage = {
							type: "server.resource_updated",
							country,
							resource,
							value,
						};
						ws.publish(`country.${country}`, updateMsg);
						ws.send(updateMsg); // Send to sender as well if publish doesn't include sender (Elysia usually doesn't)
					}
					break;
				}
			}
		},
		close(ws) {
			ws.unsubscribe("global");
			for (const c of COUNTRIES) {
				ws.unsubscribe(`country.${c}`);
			}
		},
	})
	.listen(3001);

function scheduleNewYear(targetSecond: number) {
	const now = new Date();
	let delay = targetSecond - now.getSeconds();
	if (delay < 0) {
		delay += 60;
	}
	const delayMs = delay * 1000;
	console.log(delayMs);
	setTimeout(() => {
		newYear();
		setInterval(newYear, 60000);
	}, delayMs);
}

function newYear() {
	const msg: ServerMessage = {
		type: "server.announce",
		announcement: `Happy New Year! It is now ${new Date().toLocaleTimeString()}`,
	};
	app.server?.publish("global", JSON.stringify(msg));
}

setInterval(() => {
	const msg: ServerMessage = {
		type: "server.announce",
		announcement: new Date().toISOString(),
	};
	// app.server.publish requires string for raw Bun server, but Elysia might wrap it.
	// To be safe and consistent with ws.send(obj) which stringifies, we should stringify here
	// IF ws.send(obj) stringifies.
	// Elysia WS automatically parses/stringifies JSON.
	// However, app.server.publish is the raw Bun publish.
	// So we must stringify it manually.
	app.server?.publish("global", JSON.stringify(msg));
}, 60000);

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
