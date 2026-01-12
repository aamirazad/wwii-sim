"use client";

import {
	ClockPlus,
	Dices,
	MoveRight,
	Pickaxe,
	Square,
	Swords,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useGame } from "@/app/game/GameContext";
import Dock from "@/components/dock";
import ExternalLink from "@/components/external-link";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { getUserId } from "@/lib/cookies";

interface CountryDashboardProps {
	tab: string;
	children?: React.ReactNode;
}

export default function CountryDashboard({
	children,
	tab,
}: CountryDashboardProps) {
	const {
		userState,
		connectionStatus,
		subscribedCountry,
		subscribeToCountry,
		refetchGame,
		gameState,
		subscribeToMessage,
	} = useGame();
	const commitHash = process.env.NEXT_PUBLIC_COMMIT_SHA?.substring(0, 7);
	const [isStopping, setIsStopping] = useState(false);
	const [currentYear, setCurrentYear] = useState<number | null>(null);
	const [newYearOpen, setNewYearOpen] = useState(false);

	const userId = getUserId();
	const router = useRouter();

	const yearFromGameState =
		gameState.status === "has-game" ? gameState.game.currentYear : null;

	useEffect(() => {
		if (yearFromGameState !== null) {
			setCurrentYear(yearFromGameState);
		}
	}, [yearFromGameState]);

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

	// Listen for game end WebSocket message
	useEffect(() => {
		const unsubscribe = subscribeToMessage("server.game.ended", () => {
			router.push("/");
		});
		return unsubscribe;
	}, [subscribeToMessage, router]);

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

	const isAdmin =
		userState.status === "authenticated" && userState.user.role === "admin";

	const handleStopGame = async () => {
		if (!userId || !isAdmin || gameState.status !== "has-game") return;

		setIsStopping(true);
		try {
			const response = await api
				.game({ gameId: gameState.game.id.toString() })
				.stop.patch(
					{},
					{
						query: { authorization: userId },
					},
				);
			refetchGame();
			if (response.error) {
				console.error("Failed to stop game");
				alert("Failed to stop game");
			}
		} catch (error) {
			console.error("Error stopping game:", error);
			alert("An error occurred while stopping the game");
		} finally {
			setIsStopping(false);
		}
	};

	const handleTriggerNewYear = async () => {
		if (!userId || !isAdmin || gameState.status !== "has-game") return;
		setNewYearOpen(false);

		await api
			.game({ gameId: gameState.game.id.toString() })
			["next-year"].post({}, { query: { authorization: userId } });
	};

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
			<header className="w-full pt-4 px-8 pb-3 flex justify-between items-center">
				<div className="flex items-baseline gap-4">
					<h1 className="text-5xl font-black tracking-tighter uppercase text-white leading-none">
						{country}
					</h1>
					<div className="flex items-center gap-2">
						<div className="flex items-center text-primary">
							<MoveRight size={24} />
						</div>
						<p className="font-bold text-zinc-400 uppercase">{tab}</p>
					</div>
				</div>

				<div className="flex items-center gap-3">
					{isAdmin && gameState.status === "has-game" && (
						<>
							{currentYear && (
								<AlertDialog open={newYearOpen} onOpenChange={setNewYearOpen}>
									<AlertDialogTrigger className="p-2 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
										<ClockPlus size={20} />
									</AlertDialogTrigger>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>
												Manually Trigger New Year?
											</AlertDialogTitle>
											<AlertDialogDescription>
												This will immediately change the year to{" "}
												{currentYear + 1}.
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>Cancel</AlertDialogCancel>
											<AlertDialogAction onClick={handleTriggerNewYear}>
												Trigger New Year
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							)}
							<AlertDialog>
								<AlertDialogTrigger
									disabled={isStopping}
									className="p-2 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<Square fill="#fb2c36" size={20} />
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>End Game?</AlertDialogTitle>
										<AlertDialogDescription>
											This will immediately end the game for everyone and show
											the game summary page.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction
											variant={"destructive"}
											onClick={handleStopGame}
										>
											End Game
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</>
					)}
					<p className="text-3xl font-mono font-bold text-white drop-shadow-lg">
						{currentYear}
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
			</header>
			<div className="mx-6 grow flex backdrop-brightness-50 backdrop-blur-3xl border border-white/10 rounded-xl shadow-2xl overflow-hidden relative">
				{/* Inner Content */}
				<div className="p-8 h-full overflow-auto w-full">{children}</div>
			</div>

			<div className="flex">
				<div className="p-4 grow flex gap-1 ml-4 text-zinc-400">{userName}</div>
				<div className="hover:opacity-50 transition-color duration-300 opacity-0 text-sm sp pt-6 px-4">
					{commitHash ? (
						<p>
							Build{" "}
							<ExternalLink
								href={`https://github.com/aamirazad/wwii-sim/tree/${process.env.NEXT_PUBLIC_COMMIT_SHA}`}
							>
								{commitHash}
							</ExternalLink>
						</p>
					) : null}
				</div>
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
