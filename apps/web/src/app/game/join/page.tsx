"use client";

import type { Game } from "@api/schema";
import { Clock, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Center from "@/components/center";
import FullAlert from "@/components/full-alert";
import LoadingSpinner from "@/components/loading-spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function GameWaiting({ game }: { game: Game }) {
	const [timeRemaining, setTimeRemaining] = useState<{
		days: number;
		hours: number;
		minutes: number;
		seconds: number;
	} | null>(null);
	const [isPastStartDate, setIsPastStartDate] = useState(false);
	const router = useRouter();

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

	useEffect(() => {
		if (game.status === "active") {
			router.push(`/game/${game.id}`);
		}
	}, [game.status, router, game.id]);

	return (
		<Center>
			<Card className="min-w-md">
				<CardHeader>
					<CardTitle className="text-xl text-center">
						{isPastStartDate
							? "Waiting for Game to Start"
							: "Game Starting Soon"}
					</CardTitle>
				</CardHeader>
				<CardContent className="">
					<div className="text-center space-y-4">
						{isPastStartDate ? (
							<div className="flex flex-col items-center gap-4 py-2 pb-4">
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
										Game starts on{" "}
										{new Date(game.startDate).toLocaleDateString("en-US", {
											weekday: "long",
											month: "long",
											day: "numeric",
										})}
									</p>
								</div>
								{timeRemaining && (
									<div className="grid grid-cols-4 gap-4 max-w-lg mx-auto pb-4">
										{[
											{ label: "Days", value: timeRemaining.days },
											{ label: "Hours", value: timeRemaining.hours },
											{ label: "Minutes", value: timeRemaining.minutes },
											{ label: "Seconds", value: timeRemaining.seconds },
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
							</>
						)}
					</div>
					<div className="pt-4 border-t">
						<p className="text-center text-sm text-muted-foreground">
							Game ID: {game.id}
						</p>
					</div>
				</CardContent>
			</Card>
		</Center>
	);
}

export default function JoinGame() {
	const { gameState, userState } = useGame();

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

	const game = gameState.game;
	return <GameWaiting game={game} />;
}
