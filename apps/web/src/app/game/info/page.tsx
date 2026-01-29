"use client";

import CountryDashboard from "@/components/country-dashboard";
import { useGamePageGuard } from "@/hooks/useGamePageGuard";
import { useGame } from "../GameContext";

export default function GameInfo() {
	const { gameState, userState } = useGame();

	// Guard: requires active game (mods always have access)
	useGamePageGuard({
		requires: "active-game",
		gameState,
		userState,
	});

	return <CountryDashboard tab="Info">Game info</CountryDashboard>;
}
