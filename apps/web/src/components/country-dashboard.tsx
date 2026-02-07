"use client";

import {
	CalendarClock,
	CircleGauge,
	CirclePause,
	CirclePlay,
	CircleX,
	ClockArrowUp,
	Dices,
	ExternalLinkIcon,
	Grip,
	Megaphone,
	MoveRight,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useGame } from "@/app/game/GameContext";
import Dock from "@/components/dock";
import ExternalLink from "@/components/external-link";
import FullAlert from "@/components/full-alert";
import ManageUsers from "@/components/manage-users";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
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
	const [currentYear, setCurrentYear] = useState<number | null>(null);

	const [dialogOpenNewYear, setDialogOpenNewYear] = useState(false);
	const [dialogOpenPause, setDialogOpenPause] = useState(false);
	const [dialogOpenEnd, setDialogOpenEnd] = useState(false);

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

	// Listen for game pause WebSocket message
	useEffect(() => {
		const unsubscribe = subscribeToMessage("server.game.paused", () => {
			// Only redirect non-admin and non-mod players
			if (userState.status === "authenticated") {
				const isAdminOrMod =
					userState.user.role === "admin" || userState.user.country === "Mods";
				if (!isAdminOrMod) {
					refetchGame();
					router.push("/game/paused");
				}
			}
		});
		return unsubscribe;
	}, [subscribeToMessage, router, userState, refetchGame]);

	const country =
		userState.status === "authenticated" ? userState.user.country : null;
	const userName =
		userState.status === "authenticated" ? userState.user.name : null;

	if (!country) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-muted-foreground">
					<FullAlert>
						<Alert>
							<AlertTitle>No Country Assigned</AlertTitle>
							<AlertDescription>
								{userState.status === "authenticated" &&
								userState.user.role === "admin" ? (
									<>
										You are not assigned to a country. You can assign users to
										countries <Link href="/admin/users">here</Link>.
									</>
								) : (
									"You are not assigned to a country. Please ask a mod to help you."
								)}
							</AlertDescription>
						</Alert>
					</FullAlert>
					)
				</div>
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
	const isMod =
		userState.status === "authenticated" && userState.user.country === "Mods";

	const handleStopGame = async () => {
		if (!userId || (!isAdmin && !isMod) || gameState.status !== "has-game")
			return;

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
			setDialogOpenEnd(false);
			if (response.error) {
				console.error("Failed to stop game");
				alert("Failed to stop game");
			}
		} catch (error) {
			console.error("Error stopping game:", error);
			alert("An error occurred while stopping the game");
		}
	};

	const handlePauseGame = async () => {
		if (!userId || (!isAdmin && !isMod) || gameState.status !== "has-game")
			return;

		try {
			const response = await api
				.game({ gameId: gameState.game.id.toString() })
				.pause.patch(
					{},
					{
						query: { authorization: userId },
					},
				);
			refetchGame();
			setDialogOpenPause(false);
			if (response.error) {
				console.error("Failed to pause game");
				alert("Failed to pause game");
			}
		} catch (error) {
			console.error("Error pausing game:", error);
			alert("An error occurred while pausing the game");
		}
	};

	const handleUnpauseGame = async () => {
		if (!userId || (!isAdmin && !isMod) || gameState.status !== "has-game")
			return;

		try {
			const response = await api
				.game({ gameId: gameState.game.id.toString() })
				.unpause.patch(
					{},
					{
						query: { authorization: userId },
					},
				);
			refetchGame();
			setDialogOpenPause(false);
			if (response.error) {
				console.error("Failed to unpause game");
				alert("Failed to unpause game");
			}
		} catch (error) {
			console.error("Error unpausing game:", error);
			alert("An error occurred while unpausing the game");
		}
	};

	const handleTriggerNewYear = async () => {
		if (!userId || (!isAdmin && !isMod) || gameState.status !== "has-game")
			return;

		setDialogOpenNewYear(false);

		await api
			.game({ gameId: gameState.game.id.toString() })
			["next-year"].post({}, { query: { authorization: userId } });
	};

	const dockItems = [
		{
			icon: <CircleGauge size={24} />,
			label: "Assets",
			href: "/game/assets",
		},
		{
			icon: <Megaphone size={24} />,
			label: "Message Board",
			href: "/game/announcements",
		},
		{
			icon: <Dices size={24} />,
			label: "Game",
			href: "/game/info",
		},
	];

	const paused =
		gameState.status === "has-game" && gameState.game.status === "paused";

	const menuItems = [
		{
			id: "new-year",
			icon: ClockArrowUp,
			label: "New Year",
			title: "Manually Trigger New Year?",
			description: `This will immediately change the year to ${currentYear ? currentYear + 1 : ""}`,
			onAction: handleTriggerNewYear,
			isDestructive: false,
			dialogOpen: dialogOpenNewYear,
			setDialogOpen: setDialogOpenNewYear,
		},
		{
			id: paused ? "unpause-game" : "pause-game",
			icon: paused ? CirclePlay : CirclePause,
			label: paused ? "Unpause Game" : "Pause Game",
			title: paused ? "Unpause Game?" : "Pause Game?",
			description: paused
				? "This will unpause the game for everyone. They will be able to access their dashboards again."
				: "This will pause the game for everyone. They will be locked out of their dashboards until a mod or admin unpauses the game.",
			onAction: paused ? handleUnpauseGame : handlePauseGame,
			isDestructive: false,
			dialogOpen: dialogOpenPause,
			setDialogOpen: setDialogOpenPause,
		},
		{
			id: "end-game",
			icon: CircleX,
			label: "End Game",
			title: "End Game?",
			description:
				"This will immediately end the game for everyone and show the game summary page.",
			onAction: handleStopGame,
			isDestructive: true,
			dialogOpen: dialogOpenEnd,
			setDialogOpen: setDialogOpenEnd,
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
						<p
							className="cursor-pointer font-bold text-zinc-400 uppercase"
							onClick={() => {
								router.push(
									dockItems.filter((item) => item.label === tab)[0].href,
								);
							}}
							onKeyDown={() => {}}
						>
							{tab}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-3">
					{(isAdmin || isMod) && gameState.status === "has-game" && (
						<TooltipProvider>
							<Popover>
								<Tooltip>
									<TooltipTrigger
										render={
											<PopoverTrigger
												render={
													<Button
														variant="ghost"
														size="icon"
														className="size-11 p-0 hover:bg-muted/50 rounded-full"
													/>
												}
											/>
										}
									>
										<Grip className="size-6 text-foreground/70" />
										<span className="sr-only">Mod Menu</span>
									</TooltipTrigger>
									<TooltipContent>
										<p>Mod Menu</p>
									</TooltipContent>
								</Tooltip>
								<PopoverContent className="w-auto p-2" align="end">
									<div className="grid grid-cols-3 gap-1">
										{menuItems.map((item) => (
											<AlertDialog
												open={item.dialogOpen}
												onOpenChange={item.setDialogOpen}
												key={item.id}
											>
												<AlertDialogTrigger
													render={
														<Button className="h-16 w-16 flex flex-col items-center justify-center gap-1.5 p-2 hover:bg-muted/80 bg-transparent border-0 rounded-lg transition-colors" />
													}
												>
													<item.icon
														className="h-5 w-5 text-foreground/70 shrink-0"
														strokeWidth={1.5}
													/>
													<span className="text-[10px] font-medium text-center text-foreground/80 leading-tight">
														{item.label}
													</span>
												</AlertDialogTrigger>
												<AlertDialogContent>
													<AlertDialogHeader>
														<AlertDialogTitle>{item.title}</AlertDialogTitle>
														<AlertDialogDescription>
															{item.description}
														</AlertDialogDescription>
													</AlertDialogHeader>
													<AlertDialogFooter>
														<AlertDialogCancel>Cancel</AlertDialogCancel>
														<AlertDialogAction
															variant={
																item.isDestructive ? "destructive" : "default"
															}
															onClick={item.onAction}
														>
															{item.label}
														</AlertDialogAction>
													</AlertDialogFooter>
												</AlertDialogContent>
											</AlertDialog>
										))}
										{userState.user.role === "admin" ? (
											<Dialog>
												<DialogTrigger
													render={
														<Button className="h-16 w-16 flex flex-col items-center justify-center gap-1.5 p-2 hover:bg-muted/80 bg-transparent border-0 rounded-lg transition-colors" />
													}
												>
													<Users
														className="h-5 w-5 text-foreground/70 shrink-0"
														strokeWidth={1.5}
													/>
													<span className="text-[10px] font-medium text-center text-foreground/80 leading-tight ">
														Players
													</span>
												</DialogTrigger>
												<DialogContent
													showCloseButton={false}
													className="max-w-fit!"
												>
													<ScrollArea className="-mx-4 max-h-[80vh] overflow-y-auto px-4">
														<ManageUsers />
													</ScrollArea>
													<DialogFooter>
														<DialogClose
															render={<Button variant="outline">Cancel</Button>}
														/>
														<Button
															nativeButton={false}
															variant={"secondary"}
															render={
																<Link
																	href="/admin/users"
																	className="no-underline"
																/>
															}
														>
															<ExternalLinkIcon /> Open in full page
														</Button>
													</DialogFooter>
												</DialogContent>
											</Dialog>
										) : null}
										<Button
											nativeButton={false}
											variant="ghost"
											className="h-16 w-16 flex flex-col items-center justify-center gap-1.5 p-2 hover:bg-muted/80 bg-transparent border-0 rounded-lg transition-colors"
											render={
												<Link href="/game/schedule" className="no-underline" />
											}
										>
											<CalendarClock
												className="h-5 w-5 text-foreground/70 shrink-0"
												strokeWidth={1.5}
											/>
											<span className="text-[10px] font-medium text-center text-foreground/80 leading-tight">
												Schedule
											</span>
										</Button>
									</div>
								</PopoverContent>
							</Popover>
						</TooltipProvider>
					)}
					<p className="text-3xl font-mono font-bold text-white drop-shadow-lg">
						{currentYear}
					</p>
					<Tooltip>
						<TooltipTrigger>
							<div className={`size-2 rounded-full ${connectionDotColor}`} />
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
