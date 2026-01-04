"use client";

import { Dices, Pickaxe, Swords } from "lucide-react";
import { useEffect } from "react";
import { useGame } from "@/app/game/GameContext";
import Dock from "@/components/dock";

interface CountryDashboardProps {
	tab: string;
	children?: React.ReactNode;
}

export default function CountryDashboard({
	children,
	tab,
}: CountryDashboardProps) {
	const { userState, connectionStatus, subscribedCountry, subscribeToCountry } =
		useGame();
	const time = new Date();

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
	const userName =
		userState.status === "authenticated" ? userState.user.name : null;

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

	const gameYear = 1942; // Placeholder

	const dockItems = [
		{
			icon: <Pickaxe size={24} />,
			label: "Resources",
			href: "/game/resources",
		},
		{
			icon: <Swords size={24} />,
			label: "Battles",
			href: "/game/battles",
		},
		{
			icon: <Dices size={24} />,
			label: "Game",
			href: "/game/info",
		},
	];

	return (
		<div className="flex flex-col grow relative">
			{/* Top Bar */}
			<header className="w-full pt-6 px-8 pb-2 flex justify-between items-start">
				<div className="flex flex-col">
					<h1 className="text-5xl font-black tracking-tighter uppercase text-white leading-none">
						{country}
					</h1>
					<div className="flex items-center gap-2 mt-2">
						<div className="h-0.5 w-10 bg-primary" />
						<p className="text-sm font-bold tracking-[0.3em] text-zinc-400 uppercase">
							{tab}
						</p>
					</div>
				</div>

				<div className="flex gap-4">
					<p className="text-lg font-medium text-zinc-400 border rounded-xl px-2 h-fit mt-2">
						{userName}
					</p>
					<div className="flex flex-col">
						<p className="text-5xl font-mono font-bold text-white drop-shadow-lg">
							{gameYear}
						</p>
						<div className="flex items-center gap-2">
							<p className="text-lg font-medium text-zinc-400 font-mono">
								{time.toLocaleTimeString([], {
									hour: "2-digit",
									minute: "2-digit",
								})}
							</p>
							<div
								className={`h-2 w-2 rounded-full ${connectionDotColor}`}
								title={
									connectionStatus === "connected"
										? "Connected"
										: connectionStatus === "connecting"
											? "Connecting..."
											: "Disconnected"
								}
							/>
						</div>
					</div>
				</div>
			</header>

			{/* Main Content Island */}
			<div className="mx-6 grow flex bg-zinc-900/50 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden relative">
				{/* Inner Content */}
				<div className="p-8 h-full overflow-auto w-full">{children}</div>
			</div>

			{/* Dock */}
			<div className="">
				<Dock
					items={dockItems}
					panelHeight={68}
					baseItemSize={50}
					magnification={70}
				/>
			</div>
		</div>
	);
}
