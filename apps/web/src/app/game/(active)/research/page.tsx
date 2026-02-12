"use client";

import CountryDashboard from "@/components/country-dashboard";
import { Alert } from "@/components/ui/alert";
import { useGamePageGuard } from "@/hooks/useGamePageGuard";
import { useGame } from "../../GameContext";

export default function GameInfo() {
	const { gameState, userState } = useGame();

	// Guard: requires active game (mods always have access)
	useGamePageGuard({
		requires: "active-game",
		gameState,
		userState,
	});

	return (
		<CountryDashboard tab="Research">
			<Alert variant="destructive" className="mb-4">
				Research is not implemented yet, please use the paper charts for now.
				Sorry about that!
			</Alert>
		</CountryDashboard>
	);
}
