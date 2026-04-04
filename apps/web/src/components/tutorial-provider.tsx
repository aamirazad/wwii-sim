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
		id: "home-premise",
		route: "/",
		title: "Welcome to WWII Sim",
		description:
			"WWII Sim is a moderated strategy game where each country manages resources, builds troops, and responds to announcements in real time.",
		selector: '[data-tutorial="home-intro"]',
	},
	{
		id: "home-countries",
		route: "/",
		title: "Playable countries",
		description:
			"Choose from Commonwealth, France, Germany, Italy, Japan, Russia, United Kingdom, and United States.",
		selector: '[data-tutorial="home-countries"]',
	},
	{
		id: "home-demo",
		route: "/",
		title: "Start a safe demo",
		description:
			"Pick a country and launch a local demo session with seeded resources, troop logs, and announcements.",
		selector: '[data-tutorial="home-demo-launch"]',
		variant: "demo-launch",
	},
	{
		id: "shell-nav",
		route: "/game/assets?tutorial=1&tab=home",
		title: "Active game shell",
		description:
			"This is the main gameplay shell. Use the country header and dock to navigate between Assets, Message Board, and Research.",
		selector: '[data-tutorial="game-shell-nav"]',
	},
	{
		id: "assets-overview",
		route: "/game/assets?tutorial=1&tab=home",
		title: "Country resource overview",
		description:
			"Track steel, oil, and population here. Most gameplay actions consume these values, so this panel drives every strategic decision.",
		selector: '[data-tutorial="assets-overview"]',
	},
	{
		id: "troop-purchase",
		route: "/game/assets?tutorial=1&tab=troop-creation",
		title: "Build troops",
		description:
			"Use the troop purchase form to choose unit quantities. The total cost summary shows steel, oil, and population impact before purchase.",
		selector: '[data-tutorial="troop-purchase-card"]',
	},
	{
		id: "troop-allocation",
		route: "/game/assets?tutorial=1&tab=troop-creation",
		title: "Allocate troop locations",
		description:
			"After purchase, allocate troops to specific locations and mark home territory. This mirrors the real location allocation workflow.",
		selector: '[data-tutorial="troop-location-card"]',
	},
	{
		id: "resource-logs",
		route: "/game/assets?tutorial=1&tab=change-resources",
		title: "Resource loss and change logs",
		description:
			"Open resource history to review gains/losses, notes, and timestamps. This is where you audit moderator and combat-driven resource changes.",
		selector: '[data-tutorial="resource-history-trigger"]',
	},
	{
		id: "announcements-feed",
		route: "/game/announcements?tutorial=1",
		title: "Announcement feed",
		description:
			"Major updates, battle outcomes, and moderator instructions are posted here for countries to react to quickly.",
		selector: '[data-tutorial="announcements-feed"]',
	},
	{
		id: "free-play",
		route: "/game/assets?tutorial=1&tab=home",
		title: "You are ready",
		description:
			"You are now free to explore the dashboard on your own. Try changing resources, buying troops, and moving units in demo mode.",
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

		const updateSpotlight = () => {
			const element = document.querySelector(currentStep.selector ?? "");
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

		updateSpotlight();
		window.addEventListener("resize", updateSpotlight);
		window.addEventListener("scroll", updateSpotlight, true);
		const interval = window.setInterval(updateSpotlight, 200);

		return () => {
			window.removeEventListener("resize", updateSpotlight);
			window.removeEventListener("scroll", updateSpotlight, true);
			window.clearInterval(interval);
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
					className="fixed bottom-4 right-4 z-[60] shadow-xl"
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
							className="fixed z-[70] pointer-events-none rounded-xl border-2 border-primary/80 transition-all duration-200"
							style={spotlightStyle}
						/>
					) : (
						<div className="fixed inset-0 z-[70] bg-slate-950/75" />
					)}
					<Card className="fixed bottom-4 right-4 z-[80] w-[min(27rem,calc(100vw-1rem))] border-primary/40 bg-background/95 shadow-2xl backdrop-blur">
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
