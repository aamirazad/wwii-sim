"use client";

import type { ClientMessage, ServerMessage } from "@api/ws-events";
import { useEffect, useRef, useState } from "react";

interface WsPanelProps {
	webVersion: string;
}

export default function WsPanel({ webVersion }: WsPanelProps) {
	const [connected, setConnected] = useState(false);
	const [apiVersion, setApiVersion] = useState<string | null>(null);
	const [time, setTime] = useState<string | null>(null);
	const [counter, setCounter] = useState<number | null>(null);
	const wsRef = useRef<WebSocket | null>(null);

	useEffect(() => {
		const wsUrl =
			process.env.NEXT_PUBLIC_API_WS_URL || "ws://localhost:3001/ws";
		const ws = new WebSocket(wsUrl);
		wsRef.current = ws;

		ws.onopen = () => {
			setConnected(true);
		};

		ws.onmessage = (event) => {
			try {
				const msg = JSON.parse(event.data) as ServerMessage;
				if (msg.type === "server:connected") {
					setApiVersion(msg.apiVersion);
					setCounter(msg.counter);
				} else if (msg.type === "server:time") {
					setTime(msg.time);
				} else if (msg.type === "server:counter") {
					setCounter(msg.counter);
				}
			} catch (e) {
				console.error("Failed to parse WS message", e);
			}
		};

		ws.onclose = () => {
			setConnected(false);
		};

		return () => {
			ws.close();
		};
	}, []);

	const increment = () => {
		if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
			const msg: ClientMessage = { type: "client:counter:increment" };
			wsRef.current.send(JSON.stringify(msg));
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
				<p>Server Time: {time || "Waiting..."}</p>
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
				</div>
			</div>
		</div>
	);
}
