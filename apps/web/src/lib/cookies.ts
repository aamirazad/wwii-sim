import type { PlayableCountry } from "@api/schema";

/**
 * Cookie utilities for client-side cookie management
 *
 * Note: Direct document.cookie assignment is the standard browser API.
 * We centralize cookie operations here for consistency.
 */

const ONE_YEAR_IN_SECONDS = 31536000;
const TUTORIAL_STATE_COOKIE = "tutorialState";

export interface TutorialState {
	hasSeenIntro: boolean;
	dismissed: boolean;
	completed: boolean;
	demoMode: boolean;
	demoCountry: PlayableCountry;
}

export const DEFAULT_TUTORIAL_STATE: TutorialState = {
	hasSeenIntro: false,
	dismissed: false,
	completed: false,
	demoMode: false,
	demoCountry: "Germany",
};

function isPlayableCountry(value: unknown): value is PlayableCountry {
	return (
		value === "Commonwealth" ||
		value === "France" ||
		value === "Germany" ||
		value === "Italy" ||
		value === "Japan" ||
		value === "Russia" ||
		value === "United Kingdom" ||
		value === "United States"
	);
}

function parseTutorialState(rawValue: string | null): TutorialState {
	if (!rawValue) return DEFAULT_TUTORIAL_STATE;
	try {
		const parsed = JSON.parse(rawValue);
		if (!parsed || typeof parsed !== "object") return DEFAULT_TUTORIAL_STATE;
		const safeDemoCountry = isPlayableCountry(parsed.demoCountry)
			? parsed.demoCountry
			: DEFAULT_TUTORIAL_STATE.demoCountry;
		return {
			hasSeenIntro: Boolean(parsed.hasSeenIntro),
			dismissed: Boolean(parsed.dismissed),
			completed: Boolean(parsed.completed),
			demoMode: Boolean(parsed.demoMode),
			demoCountry: safeDemoCountry,
		};
	} catch {
		return DEFAULT_TUTORIAL_STATE;
	}
}

/**
 * Get a cookie value by name
 */
export function getCookie(name: string): string | null {
	if (typeof document === "undefined") return null;
	const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
	return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Set a cookie with the given name and value
 */
export function setCookie(
	name: string,
	value: string,
	options: {
		maxAge?: number;
		path?: string;
	} = {},
): void {
	const { maxAge = ONE_YEAR_IN_SECONDS, path = "/" } = options;
	// biome-ignore lint/suspicious/noDocumentCookie: This is a cookie utility
	document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=${path}`;
}

/**
 * Delete a cookie by name
 */
export function deleteCookie(name: string, path = "/"): void {
	// biome-ignore lint/suspicious/noDocumentCookie: This is a cookie utility
	document.cookie = `${name}=; max-age=0; path=${path}`;
}

/**
 * Get the userId from the cookie
 */
export function getUserId(): string | null {
	return getCookie("userId");
}

/**
 * Set the userId cookie
 */
export function setUserId(userId: string): void {
	setCookie("userId", userId);
}

/**
 * Clear the userId cookie (logout)
 */
export function clearUserId(): void {
	deleteCookie("userId");
}

export function getTutorialState(): TutorialState {
	return parseTutorialState(getCookie(TUTORIAL_STATE_COOKIE));
}

export function setTutorialState(
	partial: Partial<TutorialState>,
): TutorialState {
	const nextState = {
		...getTutorialState(),
		...partial,
	};
	setCookie(TUTORIAL_STATE_COOKIE, JSON.stringify(nextState));
	return nextState;
}

export function setTutorialDemoMode(
	isEnabled: boolean,
	demoCountry?: PlayableCountry,
): TutorialState {
	return setTutorialState({
		demoMode: isEnabled,
		demoCountry: demoCountry ?? getTutorialState().demoCountry,
	});
}
