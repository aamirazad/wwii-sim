"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import CountryDashboard from "@/components/country-dashboard";
import LoadingSpinner from "@/components/loading-spinner";
import { useGame } from "../GameContext";

export default function GameResources() {
	const { gameState } = useGame();
	const router = useRouter();

	useEffect(() => {
		if (gameState.status !== "has-game") {
			router.push("/game/join");
		}
	}, [gameState.status, router]);

	if (gameState.status !== "has-game") return <LoadingSpinner />;

	return <CountryDashboard />;
}
