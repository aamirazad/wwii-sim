"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import CountryDashboard from "@/components/country-dashboard";
import LoadingSpinner from "@/components/loading-spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGame } from "../GameContext";

function ResourceCard({ name, value }: { name: string; value: number }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{name}</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="flex flex-col space-y-2">
					<div className="text-3xl font-bold">{value.toLocaleString()}</div>
				</div>
			</CardContent>
		</Card>
	);
}

export default function GameResources() {
	const { gameState, countryResources } = useGame();
	const router = useRouter();

	useEffect(() => {
		if (gameState.status !== "has-game") {
			router.push("/game/join");
		}
	}, [gameState.status, router]);

	if (gameState.status !== "has-game") return <LoadingSpinner />;

	return (
		<CountryDashboard tab="Resources">
			<div className="space-y-6 w-full">
				<h2 className="text-3xl font-bold text-white">Resources</h2>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<ResourceCard name="Oil" value={countryResources?.oil ?? 0} />
					<ResourceCard name="Steel" value={countryResources?.steel ?? 0} />
					<ResourceCard
						name="Population"
						value={countryResources?.population ?? 0}
					/>
				</div>
			</div>
		</CountryDashboard>
	);
}
