"use client";

import type { Game, User } from "@api/schema";
import { useQuery } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext } from "react";
import { api } from "@/lib/api";
import { getUserId } from "@/lib/cookies";

type GameState =
	| { status: "loading" }
	| { status: "error"; message: string }
	| { status: "no-game" }
	| { status: "has-game"; game: Game };

type UserState =
	| { status: "loading" }
	| { status: "error"; message: string }
	| { status: "unauthenticated" }
	| { status: "authenticated"; user: User };

interface GameContextType {
	gameState: GameState;
	userState: UserState;
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
	const userId = getUserId();

	// Query for current game
	const {
		data: gameData,
		isLoading: gameLoading,
		isError: gameError,
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
		refetchInterval: 5000, // TODO: change to use websocket to detect game start
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
		retry: 0,
		staleTime: 60000,
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

	return (
		<GameContext.Provider
			value={{
				gameState,
				userState,
			}}
		>
			{children}
		</GameContext.Provider>
	);
}
