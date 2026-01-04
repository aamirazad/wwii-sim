"use client";

import { useEffect, useState } from "react";
import { useGame } from "@/app/game/GameContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CountryDashboard() {
	const {
		userState,
		connectionStatus,
		subscribedCountry,
		countryResources,
		subscribeToCountry,
	} = useGame();
	const [activeTab, setActiveTab] = useState<
		"resources" | "troops" | "research" | "info"
	>("resources");

	// Subscribe to country when connected and user has a country
	useEffect(() => {
		if (
			connectionStatus === "connected" &&
			userState.status === "authenticated" &&
			userState.user.country &&
			!subscribedCountry
		) {
			subscribeToCountry();
		}
	}, [connectionStatus, userState, subscribedCountry, subscribeToCountry]);

	const country =
		userState.status === "authenticated" ? userState.user.country : null;

	if (!country) {
		return (
			<div className="flex items-center justify-center h-64">
				<p className="text-muted-foreground">
					You are not assigned to a country. Please contact an admin.
				</p>
			</div>
		);
	}

	const connectionDotColor =
		connectionStatus === "connected"
			? "bg-green-500"
			: connectionStatus === "connecting"
				? "bg-yellow-500"
				: "bg-red-500";

	return (
		<div className="space-y-6 p-6 z-10">
			<div className="flex justify-between items-center">
				<h2 className="text-2xl font-bold">{country} Dashboard</h2>
				<div className="flex items-center gap-2">
					<span
						className={`h-3 w-3 rounded-full ${connectionDotColor}`}
						title={
							connectionStatus === "connected"
								? "Connected"
								: connectionStatus === "connecting"
									? "Connecting..."
									: "Disconnected"
						}
					/>
					{subscribedCountry && (
						<span className="text-sm text-muted-foreground">
							Subscribed to {subscribedCountry}
						</span>
					)}
				</div>
			</div>

			<div className="flex space-x-2">
				<Button
					variant={activeTab === "resources" ? "default" : "outline"}
					onClick={() => setActiveTab("resources")}
				>
					Resources
				</Button>
				<Button
					variant={activeTab === "troops" ? "default" : "outline"}
					disabled
					title="Not available yet"
				>
					Troops
				</Button>
				<Button
					variant={activeTab === "research" ? "default" : "outline"}
					disabled
					title="Not available yet"
				>
					Research
				</Button>
				<Button
					variant={activeTab === "info" ? "default" : "outline"}
					disabled
					title="Not available yet"
				>
					Game Info
				</Button>
			</div>

			{activeTab === "resources" && (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<ResourceCard name="Oil" value={countryResources?.oil ?? 0} />
					<ResourceCard name="Steel" value={countryResources?.steel ?? 0} />
					<ResourceCard
						name="Population"
						value={countryResources?.population ?? 0}
					/>
				</div>
			)}
		</div>
	);
}

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
