"use client";

import { PLAYABLE_COUNTRIES, type PlayableCountry } from "@api/schema";
import { Compass, Play, SkipForward } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DEFAULT_TUTORIAL_STATE,
	getTutorialState,
	getUserId,
	setTutorialState,
	type TutorialState,
} from "@/lib/cookies";

type TutorialStep = {
	id: string;
	route: string;
	title: string;
	description: string;
	selector?: string;
	variant?: "standard" | "demo-launch";
};

const TUTORIAL_STEPS: TutorialStep[] = [
	{
		id: "home-tutorial",
		route: "/",
		title: "Welcome to WWII Sim Tutorial",
		description:
			"This website is quite complex, so this tutorial will walk you through all the features and give you all the tools you need to host your own simulations of your very own!",
		selector: '[data-tutorial="home-title"]',
	},
	{
		id: "home-premise",
		route: "/",
		title: "Here's how it works",
		description:
			"The WWII Sim is a moderated strategy game where groups of people act as a country during the Second World War. As the game progresses, each team will strategize, manage resources, build troops, and respond to other countries' actions.",
		selector: '[data-tutorial="home-tutorial"]',
	},
	{
		id: "home-countries",
		route: "/",
		title: "Playable countries",
		description:
			"Before the game starts, each player joins a country. A country can be played solo, or with other people. More important countries such as Germany and U.S. tend to have 3-4 players playing the country at once! These are the options.",
		selector: '[data-tutorial="home-countries"]',
	},
	{
		id: "home-demo",
		route: "/",
		title: "Start the demo",
		description:
			"Pick a country, we will create a fake game for you to try things out safely. In a real game, you would join your country by clicking the link sent to your email.",
		selector: '[data-tutorial="home-demo-launch"]',
		variant: "demo-launch",
	},
	{
		id: "shell-nav",
		route: "/game/assets?tutorial=1&tab=home",
		title: "Country Dashboard",
		description:
			"This is the main country dashboard. The first page the player sees is the Assets page, where they can manage all the resources the country has and use such resources. The dock in the bottom allows them to switch between pages.",
		selector: '[data-tutorial="game-shell-nav"]',
	},
	{
		id: "assets-overview",
		route: "/game/assets?tutorial=1&tab=home",
		title: "Resources",
		description:
			"There are three resources a country has to manage: steel, oil, and population. Most gameplay actions consume these values, so having easy access to these numbers are essential. Countries get resources for successfully capturing territory, and every year they get a certain number of resources depending on their level.",
		selector: '[data-tutorial="assets-overview"]',
	},
	{
		id: "troop-purchase",
		route: "/game/assets?tutorial=1&tab=troop-creation",
		title: "Build troops",
		description:
			"Countries can and should use the resources they collect to build their troops. This form allows the country to select what type of troops they would like to build, as well as requiring them to place the troops in a certain location on creation. After purchase, resources are automatically deducted.",
		selector: '[data-tutorial="troop-purchase-card"]',
	},
	{
		id: "resource-logs",
		route: "/game/assets?tutorial=1&tab=change-resources",
		title: "Resource change logs",
		description:
			"All actions are logged. Every change requires a note, which is the reason for such change. During the game, moderators have access to a special Mod Dashboard where they can view every countries resources as well as their change log. It is their job to make sure countries are playing fairly and not playing in a historically accurate way.",
		selector: '[data-tutorial="resource-history-trigger"]',
	},
	{
		id: "announcements-feed",
		route: "/game/announcements?tutorial=1",
		title: "Announcement feed",
		description:
			"As the game progresses, moderators declare major updates and battle outcomes here. Announcements can be sent to certain countries if they should not be revealed publicly.",
		selector: '[data-tutorial="announcements-feed"]',
	},
		{
		id: "auto-update",
		route: "/game/assets?tutorial=1&tab=home",
		title: "Data Syncs in Real-Time",
		description:
			"Since multiple players can be working together to manage a country, dashboard uses websockets to deliver updates in real time. Every change automatically syncs across all players in the country, as well as the moderators.",
		selector: '[data-tutorial="assets-overview"]',
	},
	{
		id: "free-play",
		route: "/game/assets?tutorial=1&tab=home",
		title: "You are now ready",
		description:
			"You are now free to explore the dashboard on your own. In demo mode, you cannot play with other people. If you would like to host a game of your own with other people, please click the button below.",
		selector: '[data-tutorial="game-shell-nav"]',
	},
];

interface TutorialContextValue {
	isActive: boolean;
	isDemoMode: boolean;
	demoCountry: PlayableCountry;
	currentStepId: string | null;
	startTutorial: () => void;
	dismissTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextValue | undefined>(
	undefined,
);

function routeMatches(
	targetRoute: string,
	pathname: string,
	searchParams: URLSearchParams,
): boolean {
	const targetUrl = new URL(targetRoute, "https://wwii-sim.local");
	if (targetUrl.pathname !== pathname) return false;
	for (const [key, value] of targetUrl.searchParams.entries()) {
		if (searchParams.get(key) !== value) return false;
	}
	return true;
}

export function TutorialProvider({ children }: { children: ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [persistedState, setPersistedState] = useState<TutorialState>(
		DEFAULT_TUTORIAL_STATE,
	);
	const [isHydrated, setIsHydrated] = useState(false);
	const [isActive, setIsActive] = useState(false);
	const [currentStepIndex, setCurrentStepIndex] = useState(0);
	const [demoCountry, setDemoCountry] = useState<PlayableCountry>(
		DEFAULT_TUTORIAL_STATE.demoCountry,
	);
	const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
	const currentStep = isActive ? TUTORIAL_STEPS[currentStepIndex] : null;

	const persistState = useCallback((partial: Partial<TutorialState>) => {
		const nextState = setTutorialState(partial);
		setPersistedState(nextState);
		return nextState;
	}, []);

	const dismissTutorial = useCallback(() => {
		setIsActive(false);
		setSpotlightRect(null);
		persistState({ dismissed: true, demoMode: false });
	}, [persistState]);

	const finishTutorial = useCallback(() => {
		setIsActive(false);
		setSpotlightRect(null);
		persistState({ completed: true, dismissed: false, demoMode: true });
		router.push("/game/assets?tutorial=1&tab=home");
	}, [persistState, router]);

	const startTutorial = useCallback(() => {
		setIsActive(true);
		setCurrentStepIndex(0);
		setSpotlightRect(null);
		const nextState = persistState({
			hasSeenIntro: true,
			dismissed: false,
			completed: false,
			demoMode: false,
		});
		setDemoCountry(nextState.demoCountry);
		router.push("/");
	}, [persistState, router]);

	const goToStep = useCallback(
		(index: number) => {
			const safeIndex = Math.max(0, Math.min(index, TUTORIAL_STEPS.length - 1));
			setCurrentStepIndex(safeIndex);
			if (safeIndex === TUTORIAL_STEPS.length - 1 && index > safeIndex) {
				finishTutorial();
			}
		},
		[finishTutorial],
	);

	const moveNext = useCallback(() => {
		if (currentStepIndex >= TUTORIAL_STEPS.length - 1) {
			finishTutorial();
			return;
		}
		goToStep(currentStepIndex + 1);
	}, [currentStepIndex, finishTutorial, goToStep]);

	const beginDemoLaunch = useCallback(() => {
		persistState({ demoMode: true, demoCountry, dismissed: false });
		goToStep(currentStepIndex + 1);
	}, [currentStepIndex, demoCountry, goToStep, persistState]);

	useEffect(() => {
		setIsHydrated(true);
		const currentState = getTutorialState();
		setPersistedState(currentState);
		setDemoCountry(currentState.demoCountry);
	}, []);

	useEffect(() => {
		if (!isHydrated || isActive) return;
		if (getUserId()) return;
		if (persistedState.hasSeenIntro) return;
		startTutorial();
	}, [isActive, isHydrated, persistedState.hasSeenIntro, startTutorial]);

	useEffect(() => {
		if (!currentStep || !isActive) return;
		const matches = routeMatches(
			currentStep.route,
			pathname,
			new URLSearchParams(searchParams.toString()),
		);
		if (!matches) {
			router.push(currentStep.route);
		}
	}, [currentStep, isActive, pathname, router, searchParams]);

	useEffect(() => {
		if (!isActive || !currentStep?.selector) {
			setSpotlightRect(null);
			return;
		}

		let frameId: number | null = null;
		let observedElement: Element | null = null;
		let resizeObserver: ResizeObserver | null = null;
		const updateSpotlight = () => {
			frameId = null;
			const element = document.querySelector(currentStep.selector ?? "");
			if (observedElement !== element) {
				resizeObserver?.disconnect();
				observedElement = element;
				if (observedElement) {
					resizeObserver = new ResizeObserver(() => {
						scheduleSpotlightUpdate();
					});
					resizeObserver.observe(observedElement);
				} else {
					resizeObserver = null;
				}
			}
			if (!element) {
				setSpotlightRect(null);
				return;
			}
			const rect = element.getBoundingClientRect();
			if (rect.width === 0 || rect.height === 0) {
				setSpotlightRect(null);
				return;
			}
			setSpotlightRect(rect);
		};
		const scheduleSpotlightUpdate = () => {
			if (frameId !== null) return;
			frameId = window.requestAnimationFrame(updateSpotlight);
		};
		const mutationObserver = new MutationObserver(() => {
			scheduleSpotlightUpdate();
		});
		updateSpotlight();
		window.addEventListener("resize", scheduleSpotlightUpdate);
		window.addEventListener("scroll", scheduleSpotlightUpdate, true);
		mutationObserver.observe(document.body, {
			childList: true,
			subtree: true,
			attributes: true,
		});
		return () => {
			window.removeEventListener("resize", scheduleSpotlightUpdate);
			window.removeEventListener("scroll", scheduleSpotlightUpdate, true);
			mutationObserver.disconnect();
			resizeObserver?.disconnect();
			if (frameId !== null) {
				window.cancelAnimationFrame(frameId);
			}
		};
	}, [currentStep, isActive]);

	const spotlightStyle = useMemo(() => {
		if (!spotlightRect) return undefined;
		const padding = 8;
		const top = Math.max(0, spotlightRect.top - padding);
		const left = Math.max(0, spotlightRect.left - padding);
		const width = spotlightRect.width + padding * 2;
		const height = spotlightRect.height + padding * 2;
		return {
			top,
			left,
			width,
			height,
			boxShadow: "0 0 0 9999px rgba(2, 6, 23, 0.78)",
		};
	}, [spotlightRect]);

	const isDemoMode =
		persistedState.demoMode ||
		new URLSearchParams(searchParams.toString()).get("tutorial") === "1";

	const contextValue: TutorialContextValue = {
		isActive,
		isDemoMode,
		demoCountry,
		currentStepId: currentStep?.id ?? null,
		startTutorial,
		dismissTutorial,
	};

	return (
		<TutorialContext.Provider value={contextValue}>
			{children}
			{isHydrated && !isActive && persistedState.hasSeenIntro && (
				<Button
					onClick={startTutorial}
					className="fixed bottom-4 right-4 z-60 shadow-xl"
					variant="secondary"
				>
					<Compass className="mr-2 h-4 w-4" />
					Replay tutorial
				</Button>
			)}
			{isActive && currentStep && (
				<>
					{spotlightStyle ? (
						<div
							className="fixed z-70 pointer-events-none rounded-xl border-2 border-primary/80 transition-all duration-200"
							style={spotlightStyle}
						/>
					) : (
						<div className="fixed inset-0 z-70 bg-slate-950/75" />
					)}
					<Card className="fixed bottom-4 right-4 z-80 w-[min(30rem,calc(100vw-1rem))] border-primary/40 bg-background/95 shadow-2xl backdrop-blur">
						<CardHeader className="pb-2">
							<CardTitle className="text-lg">{currentStep.title}</CardTitle>
							<CardDescription>{currentStep.description}</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							{currentStep.id === "home-countries" && (
								<p className="text-sm text-muted-foreground">
									{PLAYABLE_COUNTRIES.join(" · ")}
								</p>
							)}
							{currentStep.variant === "demo-launch" && (
								<div className="space-y-2">
									<p className="text-xs uppercase tracking-wide text-muted-foreground">
										Demo country
									</p>
									<select
										value={demoCountry}
										onChange={(event) => {
											const country = event.target.value as PlayableCountry;
											setDemoCountry(country);
											persistState({ demoCountry: country });
										}}
										className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
									>
										{PLAYABLE_COUNTRIES.map((country) => (
											<option key={country} value={country}>
												{country}
											</option>
										))}
									</select>
									<Button onClick={beginDemoLaunch} className="w-full">
										<Play className="mr-2 h-4 w-4" />
										Launch demo session
									</Button>
								</div>
							)}
							{currentStep.id === "free-play" && (
								<Button
									onClick={() => {
										dismissTutorial();
										router.push("/login?id=ufp3zhfaqd1c1b6f5jv2jduh");
									}}
								>
									Host a Game
								</Button>
							)}
						</CardContent>
						<CardFooter className="justify-between gap-2">
							<div className="flex gap-2">
								<Button
									variant="outline"
									onClick={() => goToStep(currentStepIndex - 1)}
									disabled={currentStepIndex === 0}
								>
									Back
								</Button>
								{currentStep.variant !== "demo-launch" && (
									<Button onClick={moveNext}>
										{currentStepIndex === TUTORIAL_STEPS.length - 1
											? "Finish"
											: "Next"}
									</Button>
								)}
							</div>
							{currentStepIndex !== TUTORIAL_STEPS.length - 1 && (
								<Button variant="ghost" onClick={dismissTutorial}>
									<SkipForward className="mr-1 h-4 w-4" />
									Skip
								</Button>
							)}
						</CardFooter>
					</Card>
				</>
			)}
		</TutorialContext.Provider>
	);
}

export function useTutorial() {
	const context = useContext(TutorialContext);
	if (!context) {
		throw new Error("useTutorial must be used within a TutorialProvider");
	}
	return context;
}
