"use client";

import type {
	ClientMessage,
	Country,
	CountryResources,
	ExtendedGame,
	ServerMessage,
	User,
} from "@api/schema";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { api } from "@/lib/api";
import { getUserId } from "@/lib/cookies";

export type GameState =
	| { status: "loading" }
	| { status: "error"; message: string }
	| { status: "no-game" }
	| { status: "has-game"; game: ExtendedGame };

export type UserState =
	| { status: "loading" }
	| { status: "error"; message: string }
	| { status: "unauthenticated" }
	| { status: "authenticated"; user: User };

type ConnectionStatus = "connecting" | "connected" | "disconnected";

type MessageHandler = (message: ServerMessage) => void;

interface GameContextType {
	gameState: GameState;
	userState: UserState;
	connectionStatus: ConnectionStatus;
	subscribedCountry: Country | null;
	countryResources: CountryResources | null;
	subscribeToMessage: (type: string, handler: MessageHandler) => () => void;
	sendMessage: (message: ClientMessage) => void;
	subscribeToCountry: () => void;
	refetchGame: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function useGame() {
	const context = useContext(GameContext);
	if (context === undefined) {
		throw new Error("useGame must be used within a GameProvider");
	}
	return context;
}

export function GameProvider({ children }: { children: ReactNode }) {
	const router = useRouter();
	const userId = getUserId();
	const messageHandlers = useRef<Map<string, Set<MessageHandler>>>(new Map());
	const [subscribedCountry, setSubscribedCountry] = useState<Country | null>(
		null,
	);
	const [countryResources, setCountryResources] =
		useState<CountryResources | null>(null);

	const wsUrl = process.env.NEXT_PUBLIC_API_WS_URL || "ws://localhost:3001/ws";

	const { sendJsonMessage, lastJsonMessage, readyState } =
		useWebSocket<ServerMessage>(
			userId ? `${wsUrl}?authorization=${userId}` : null,
			{
				shouldReconnect: () => true,
				reconnectAttempts: 10,
				reconnectInterval: (attemptNumber) =>
					Math.min(1000 * 2 ** attemptNumber, 30000),
				share: true,
			},
		);

	// Convert readyState to connection status
	const connectionStatus: ConnectionStatus =
		readyState === ReadyState.OPEN
			? "connected"
			: readyState === ReadyState.CONNECTING
				? "connecting"
				: "disconnected";

	// Handle incoming messages
	useEffect(() => {
		if (!lastJsonMessage) return;

		const message = lastJsonMessage;

		// Handle country subscription confirmation
		if (message.type === "server.country.subscribed") {
			setSubscribedCountry(message.country);
		}

		// Handle country resource updates
		if (message.type === "server.country.resources") {
			setCountryResources(message.resources);
		}

		// Call all handlers subscribed to this message type
		const handlers = messageHandlers.current.get(message.type);
		if (handlers) {
			for (const handler of handlers) {
				handler(message);
			}
		}

		// Also call handlers subscribed to all messages
		const allHandlers = messageHandlers.current.get("*");
		if (allHandlers) {
			for (const handler of allHandlers) {
				handler(message);
			}
		}
	}, [lastJsonMessage]);

	// Function to subscribe to specific message types
	const subscribeToMessage = useCallback(
		(type: string, handler: MessageHandler) => {
			if (!messageHandlers.current.has(type)) {
				messageHandlers.current.set(type, new Set());
			}
			messageHandlers.current.get(type)?.add(handler);

			// Return unsubscribe function
			return () => {
				messageHandlers.current.get(type)?.delete(handler);
				if (messageHandlers.current.get(type)?.size === 0) {
					messageHandlers.current.delete(type);
				}
			};
		},
		[],
	);

	const sendMessage = useCallback(
		(message: ClientMessage) => {
			if (readyState === ReadyState.OPEN) {
				sendJsonMessage(message);
			} else {
				console.error(
					"WebSocket is not open. Unable to send message:",
					message,
				);
			}
		},
		[readyState, sendJsonMessage],
	);

	// Function to subscribe to user's country
	const subscribeToCountry = useCallback(() => {
		if (readyState === ReadyState.OPEN && userId) {
			sendJsonMessage({
				type: "client.country.subscribe",
				token: userId,
			});
		}
	}, [readyState, userId, sendJsonMessage]);

	// Query for current game
	const {
		data: gameData,
		isLoading: gameLoading,
		isError: gameError,
		refetch: refetchGame,
	} = useQuery({
		queryKey: ["game", "current"],
		queryFn: async () => {
			if (!userId) throw new Error("Unauthenticated");
			const response = await api.game.current.get({
				query: { authorization: userId },
			});
			if (response.error) throw new Error("Failed to fetch game");
			return response.data;
		},
		retry: 0,
		refetchInterval: 30000, // 30s - handles waiting/lobby state and missed WS messages
		refetchOnReconnect: true,
		refetchOnWindowFocus: true,
	});

	// Query for user
	const {
		data: userData,
		isLoading: userLoading,
		isError: userError,
	} = useQuery({
		queryKey: ["user", userId],
		queryFn: async () => {
			if (!userId) throw new Error("Unauthenticated");
			const response = await api.user({ id: userId }).get();
			if (response.error) throw new Error("Failed to fetch user");
			return response.data;
		},
		enabled: !!userId,
		refetchInterval: 60000, // 1min - catches country assignment changes
		refetchOnReconnect: true,
		refetchOnWindowFocus: true,
		retry: 0,
	});

	const gameState: GameState = (() => {
		if (gameLoading) return { status: "loading" };
		if (gameError || !gameData)
			return { status: "error", message: "Failed to connect to server" };
		// exists is a bool that is false if present
		if (!gameData.exists || !gameData.game) return { status: "no-game" };
		return { status: "has-game", game: gameData.game };
	})();

	const userState: UserState = (() => {
		if (!userId) return { status: "unauthenticated" };
		if (userLoading) return { status: "loading" };
		if (userError) return { status: "error", message: "Failed to fetch user" };
		if (!userData || userData.error) return { status: "unauthenticated" };
		return { status: "authenticated", user: userData.user };
	})();

	useEffect(() => {
		if (userState.status === "unauthenticated") {
			router.push("/");
		}
	}, [userState.status, router]);

	return (
		<GameContext.Provider
			value={{
				gameState,
				userState,
				connectionStatus,
				subscribedCountry,
				countryResources,
				subscribeToMessage,
				sendMessage,
				subscribeToCountry,
				refetchGame,
			}}
		>
			{children}
		</GameContext.Provider>
	);
}
