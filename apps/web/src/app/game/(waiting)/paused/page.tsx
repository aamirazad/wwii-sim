"use client";

import type { Game, User } from "@api/schema";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useGame } from "@/app/game/GameContext";
import Center from "@/components/center";
import FullAlert from "@/components/full-alert";
import LoadingSpinner from "@/components/loading-spinner";
import ServerOffline from "@/components/server-offline";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGamePageGuard } from "@/hooks/useGamePageGuard";

function UnauthenticatedView() {
	const router = useRouter();

	return (
		<FullAlert>
			<Alert variant="destructive" className="max-w-md">
				<AlertTitle>Not Logged In</AlertTitle>
				<AlertDescription>
					Please follow the instructions on the home page to log in.
				</AlertDescription>
			</Alert>
			<Button onClick={() => router.push("/")}>Go to Home</Button>
		</FullAlert>
	);
}

interface GamePausedProps {
	game: Game;
	isAdmin: boolean;
	isMod: boolean;
	user: User;
	connectionStatus: "connecting" | "connected" | "disconnected";
}

function GamePaused({
	game,
	isAdmin,
	isMod,
	connectionStatus,
	user,
}: GamePausedProps) {
	const [isUnpausing, setIsUnpausing] = useState(false);
	const { refetchGame } = useGame();

	const connectionDotColor =
		connectionStatus === "connected"
			? "bg-green-500"
			: connectionStatus === "connecting"
				? "bg-yellow-500"
				: "bg-red-500";

	const handleUnpauseGame = async () => {
		setIsUnpausing(true);
		try {
			const { api } = await import("@/lib/api");
			const response = await api
				.game({ gameId: game.id.toString() })
				.unpause.patch(
					{},
					{
						query: { authorization: user.id },
					},
				);
			refetchGame();
			if (response.error) {
				console.error("Failed to unpause game");
				alert("Failed to unpause game");
			}
		} catch (error) {
			console.error("Error unpausing game:", error);
			alert("An error occurred while unpausing the game");
		} finally {
			setIsUnpausing(false);
		}
	};

	return (
		<Center>
			<Card className="min-w-md">
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="text-xl">Game Paused</CardTitle>
						<div className="flex items-center gap-2">
							<Tooltip>
								<TooltipTrigger>
									<div
										className={`size-2 rounded-full ${connectionDotColor}`}
									/>
								</TooltipTrigger>
								<TooltipContent>
									{connectionStatus === "connected"
										? "Connected"
										: connectionStatus === "connecting"
											? "Connecting..."
											: "Disconnected"}
								</TooltipContent>
							</Tooltip>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="text-center space-y-4">
						<div className="flex flex-col items-center gap-4">
							<p className="text-md text-muted-foreground">
								The game has been paused by a moderator or admin.
							</p>
							<p className="text-md text-muted-foreground">
								You will automatically rejoin when the game is unpaused.
							</p>
							<Loader2 className="animate-spin text-primary" />
						</div>
						{(isAdmin || isMod) && (
							<div className="space-y-2 pt-4 border-t">
								<p className="text-sm text-muted-foreground">
									As a {isAdmin ? "admin" : "moderator"}, you can unpause the
									game at any time.
								</p>
								<Button
									onClick={handleUnpauseGame}
									disabled={isUnpausing}
									className="w-full"
								>
									{isUnpausing ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Unpausing...
										</>
									) : (
										"Unpause Game"
									)}
								</Button>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</Center>
	);
}

export default function GamePausedPage() {
	const {
		gameState,
		userState,
		connectionStatus,
		subscribeToMessage,
		refetchGame,
	} = useGame();
	const router = useRouter();

	// Listen for game unpause WebSocket message
	useEffect(() => {
		const unsubscribe = subscribeToMessage("server.game.unpaused", () => {
			// Redirect to resources page when game is unpaused
			refetchGame();
			router.replace("/game/assets");
		});

		return unsubscribe;
	}, [subscribeToMessage, router, refetchGame]);

	const gameStatus =
		gameState.status === "has-game" ? gameState.game.status : "paused";

	useEffect(() => {
		if (gameStatus !== "paused") {
			router.replace("/game/assets");
			return;
		}
	}, [gameStatus, router]);

	// Guard: requires paused game (handles redirects in effect)
	useGamePageGuard({
		requires: "paused-game",
		gameState,
		userState,
	});

	if (gameState.status === "loading" || userState.status === "loading") {
		return <LoadingSpinner />;
	}

	if (userState.status === "unauthenticated") {
		return <UnauthenticatedView />;
	}

	if (gameState.status === "error" || userState.status === "error") {
		return <ServerOffline />;
	}

	if (gameState.status === "no-game") {
		return <LoadingSpinner />;
	}

	const user = userState.user;
	const isAdmin = user.role === "admin";
	const isMod = user.country === "Mods";

	return (
		<GamePaused
			game={gameState.game}
			isAdmin={isAdmin}
			isMod={isMod}
			user={user}
			connectionStatus={connectionStatus}
		/>
	);
}
