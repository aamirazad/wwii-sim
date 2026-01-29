"use client";

import type { ClientMessage, Game, User } from "@api/schema";
import { Clock, Loader2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Center from "@/components/center";
import FullAlert from "@/components/full-alert";
import LoadingSpinner from "@/components/loading-spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGame } from "../GameContext";

function ServerOffline() {
	return (
		<FullAlert>
			<Alert variant="destructive" className="max-w-md">
				<AlertTitle>Server Unavailable</AlertTitle>
				<AlertDescription>
					The server is currently off. Please let Aamir know if you think this
					is a mistake.
				</AlertDescription>
			</Alert>
		</FullAlert>
	);
}

function UnauthenticatedView() {
	const router = useRouter();

	return (
		<FullAlert>
			<Alert variant="destructive" className="max-w-md">
				<AlertTitle>Not Logged In</AlertTitle>
				<AlertDescription>
					Please follow the instructions on the home page to login in.
				</AlertDescription>
			</Alert>
			<Button onClick={() => router.push("/")}>Go to Home</Button>
		</FullAlert>
	);
}

function NoGameInProgress({ isAdmin }: { isAdmin: boolean }) {
	const router = useRouter();

	return (
		<FullAlert>
			<Alert className="max-w-md">
				<AlertTitle>No Active Game</AlertTitle>
				<AlertDescription>
					{isAdmin
						? "As an admin, you can create a new game."
						: "There is no game currently scheduled, come back later."}
				</AlertDescription>
			</Alert>
			{isAdmin ? (
				<Button onClick={() => router.push("/create")}>Create New Game</Button>
			) : null}
		</FullAlert>
	);
}

interface GameWaitingProps {
	game: Game;
	isAdmin: boolean;
	user: User;
	connectionStatus: "connecting" | "connected" | "disconnected";
	sendMessage: (message: ClientMessage) => void;
}

function GameWaiting({
	game,
	isAdmin,
	connectionStatus,
	sendMessage,
	user,
}: GameWaitingProps) {
	const [timeRemaining, setTimeRemaining] = useState<{
		days: number;
		hours: number;
		minutes: number;
		seconds: number;
	} | null>(null);
	const [isPastStartDate, setIsPastStartDate] = useState(false);

	const connectionDotColor =
		connectionStatus === "connected"
			? "bg-green-500"
			: connectionStatus === "connecting"
				? "bg-yellow-500"
				: "bg-red-500";

	useEffect(() => {
		const calculateTimeRemaining = () => {
			const now = Date.now();
			const startTime = new Date(game.startDate).getTime();
			const difference = startTime - now;

			if (difference <= 0) {
				setIsPastStartDate(true);
				setTimeRemaining(null);
				return;
			}

			setIsPastStartDate(false);
			const days = Math.floor(difference / (1000 * 60 * 60 * 24));
			const hours = Math.floor(
				(difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
			);
			const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
			const seconds = Math.floor((difference % (1000 * 60)) / 1000);

			setTimeRemaining({ days, hours, minutes, seconds });
		};

		calculateTimeRemaining();
		const interval = setInterval(calculateTimeRemaining, 1000);

		return () => clearInterval(interval);
	}, [game.startDate]);

	return (
		<Center>
			<Card className="min-w-md">
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="text-xl">
							{isPastStartDate
								? "Waiting for Game to Start"
								: "Game Starting Soon"}
						</CardTitle>
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
						{isPastStartDate ? (
							<div className="flex flex-col items-center gap-4">
								<p className="text-md text-muted-foreground">
									The game should start soon!
								</p>
								<Loader2 className=" animate-spin text-primary" />
							</div>
						) : (
							<>
								<div className="flex items-center justify-center gap-2 text-muted-foreground">
									<Clock className="h-5 w-5" />
									<p className="text-lg">
										The game is scheduled to start on{" "}
										{new Date(game.startDate).toLocaleDateString("en-US", {
											weekday: "long",
											month: "long",
											day: "numeric",
										})}
									</p>
								</div>
								{timeRemaining && (
									<div className="grid grid-cols-4 gap-4 max-w-lg mx-auto">
										{[
											{
												label: `${timeRemaining.days === 1 ? "Day" : "Days"}`,
												value: timeRemaining.days,
											},
											{
												label: `${timeRemaining.hours === 1 ? "Hour" : "Hours"}`,
												value: timeRemaining.hours,
											},
											{
												label: `${timeRemaining.minutes === 1 ? "Minute" : "Minutes"}`,
												value: timeRemaining.minutes,
											},
											{
												label: `${timeRemaining.seconds === 1 ? "Second" : "Seconds"}`,
												value: timeRemaining.seconds,
											},
										].map((item) => (
											<div
												key={item.label}
												className="flex flex-col items-center p-4 bg-secondary rounded-lg"
											>
												<span className="text-4xl font-bold tabular-nums">
													{item.value.toString().padStart(2, "0")}
												</span>
												<span className="text-sm text-muted-foreground mt-1">
													{item.label}
												</span>
											</div>
										))}
									</div>
								)}
								{user.country && <div>You are playing as {user.country}</div>}
							</>
						)}
						{isAdmin && (
							<div className="space-y-2">
								<p>As an admin, you can start the game at any time.</p>
								<div className="flex gap-2 justify-center ">
									<Button
										onClick={() =>
											sendMessage({
												type: "client.game.start",
												gameId: game.id,
												token: user.id,
											})
										}
									>
										Start Game
									</Button>
									<Link href="/admin/users">
										<Button variant="outline">
											<Users className="mr-2 h-4 w-4" />
											Manage Users
										</Button>
									</Link>
								</div>
								<p className="text-center text-xs text-muted-foreground">
									Game ID: {game.id}
								</p>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</Center>
	);
}

export default function JoinGame() {
	const {
		gameState,
		userState,
		connectionStatus,
		subscribeToMessage,
		sendMessage,
		refetchGame,
	} = useGame();
	const router = useRouter();

	// Poll for game status updates while on waiting screen
	useEffect(() => {
		const interval = setInterval(() => {
			refetchGame();
		}, 2000); // Poll every 2 seconds

		return () => clearInterval(interval);
	}, [refetchGame]);

	// Listen for game start WebSocket message
	useEffect(() => {
		const unsubscribe = subscribeToMessage("server.game.started", () => {
			refetchGame();
		});

		return unsubscribe;
	}, [subscribeToMessage, refetchGame]);

	useEffect(() => {
		if (gameState.status === "has-game" && gameState.game.status === "active") {
			router.replace("/game/resources");
		}
	}, [gameState, router]);

	if (gameState.status === "loading" || userState.status === "loading") {
		return <LoadingSpinner />;
	}

	if (userState.status === "unauthenticated") {
		return <UnauthenticatedView />;
	}

	if (gameState.status === "error" || userState.status === "error") {
		return <ServerOffline />;
	}

	const user = userState.user;
	const isAdmin = user.role === "admin";

	if (gameState.status === "no-game") {
		return <NoGameInProgress isAdmin={isAdmin} />;
	}

	if (gameState.game.status === "waiting") {
		return (
			<GameWaiting
				game={gameState.game}
				isAdmin={isAdmin}
				user={user}
				connectionStatus={connectionStatus}
				sendMessage={sendMessage}
			/>
		);
	}
}
