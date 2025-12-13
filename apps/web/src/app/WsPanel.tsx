"use client";

import type { ClientMessage, ServerMessage } from "@api/ws-events";
import { useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";

interface WsPanelProps {
	webVersion: string;
}

export default function WsPanel({ webVersion }: WsPanelProps) {
	const [apiVersion, setApiVersion] = useState<string | null>(null);
	const [announcement, setAnnouncement] = useState<string | null>(null);
	const [counter, setCounter] = useState<number | null>(null);
	const [offset, setOffset] = useState<number | null>(null);

	const wsUrl = process.env.NEXT_PUBLIC_API_WS_URL || "ws://localhost:3001/ws";

	const { sendJsonMessage, readyState } = useWebSocket(wsUrl, {
		shouldReconnect: () => true,
		onMessage: (event) => {
			try {
				const msg = JSON.parse(event.data) as ServerMessage;
				switch (msg.type) {
					case "server.connected":
						setApiVersion(msg.apiVersion);
						setCounter(msg.counter);
						break;
					case "server.announce":
						setAnnouncement(msg.announcement);
						break;
					case "server.counter":
						setCounter(msg.counter);
						break;
				}
			} catch (e) {
				console.error("Failed to parse WS message", e);
			}
		},
	});

	const connected = readyState === ReadyState.OPEN;

	const increment = () => {
		const msg: ClientMessage = { type: "client.counter.increment" };
		sendJsonMessage(msg);
	};

	const submitTimeOffset = (e: React.FormEvent) => {
		e.preventDefault();
		if (offset !== null) {
			const msg: ClientMessage = {
				type: "client.game.set_time_offset",
				seconds: offset,
			};
			sendJsonMessage(msg);
		}
	};

	return (
		<div className="p-4 border rounded mt-4 max-w-md">
			<h2 className="text-xl font-bold mb-2">Live Status</h2>
			<div className="space-y-2">
				<p>
					Status:{" "}
					{connected ? (
						<span className="text-green-500 font-semibold">Connected</span>
					) : (
						<span className="text-red-500 font-semibold">Disconnected</span>
					)}
				</p>
				<p>Web Version: {webVersion}</p>
				<p>API Version: {apiVersion || "Waiting..."}</p>
				<p>Announcement: {announcement || "Waiting..."}</p>
				<div className="mt-4 pt-4 border-t">
					<p className="text-sm text-gray-500 mb-1">Global Counter</p>
					<div className="flex items-center gap-4">
						<span className="text-3xl font-bold">
							{counter !== null ? counter : "-"}
						</span>
						<button
							type="button"
							onClick={increment}
							className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
						>
							Click me
						</button>
					</div>
					<form onSubmit={submitTimeOffset} className="gap-1 flex flex-col">
						<label htmlFor="time">Tiger time sync</label>
						<input
							onChange={(e) => {
								setOffset(parseInt(e.target.value, 10));
							}}
							type="number"
							id="time"
							className="border"
						></input>
						<button
							type="submit"
							className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 w-fit rounded transition-colors"
						>
							Click me
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
