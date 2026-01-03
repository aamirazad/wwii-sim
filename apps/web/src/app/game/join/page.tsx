"use client";

import { useRouter } from "next/navigation";
import FullAlert from "@/components/full-alert";
import LoadingSpinner from "@/components/loading-spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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

	if (isAdmin) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
				<Alert className="max-w-md">
					<AlertTitle>No Active Game</AlertTitle>
					<AlertDescription>
						There is no game currently in progress. As an admin, you can create
						a new game.
					</AlertDescription>
				</Alert>
				{isAdmin ?? (
					<Button onClick={() => router.push("/create")}>
						Create New Game
					</Button>
				)}
			</div>
		);
	}
}

function GameDashboardContent({ gameName }: { gameName: string }) {
	return (
		<div className="container mx-auto py-8">
			<h1 className="text-3xl font-bold mb-6">Game Dashboard</h1>
			<p className="text-muted-foreground">
				Currently playing: Game #{gameName}
			</p>
			{/* Future dashboard content goes here */}
		</div>
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
	return <GameDashboardContent gameName={game.id.toString()} />;
}
