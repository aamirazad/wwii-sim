import type { PlayableCountry } from "@api/schema";
import type { TutorialDemoData } from "@/lib/tutorial-demo-data";
import { getTutorialDemoData } from "@/lib/tutorial-demo-data";

const getStorageKey = (country: PlayableCountry) =>
	`tutorialDemoState:${country}`;

const toDate = (value: unknown): Date => {
	if (value instanceof Date) return value;
	if (typeof value === "string" || typeof value === "number") {
		const date = new Date(value);
		if (!Number.isNaN(date.getTime())) return date;
	}
	return new Date();
};

function reviveTutorialDemoData(raw: TutorialDemoData): TutorialDemoData {
	return {
		...raw,
		countryState: {
			...raw.countryState,
			createdAt: toDate(raw.countryState.createdAt),
			updatedAt: toDate(raw.countryState.updatedAt),
		},
		troopLocations: raw.troopLocations.map((location) => ({
			...location,
			createdAt: toDate(location.createdAt),
			updatedAt: toDate(location.updatedAt),
		})),
		resourceLogs: raw.resourceLogs.map((log) => ({
			...log,
			createdAt: toDate(log.createdAt),
		})),
		troopLogs: raw.troopLogs.map((log) => ({
			...log,
			createdAt: toDate(log.createdAt),
		})),
		announcements: raw.announcements.map((announcement) => ({
			...announcement,
			createdAt: toDate(announcement.createdAt),
		})),
	};
}

export function loadTutorialDemoState(
	country: PlayableCountry,
): TutorialDemoData {
	const seeded = getTutorialDemoData(country);
	if (typeof window === "undefined") return seeded;

	try {
		const raw = window.localStorage.getItem(getStorageKey(country));
		if (!raw) return seeded;
		const parsed = JSON.parse(raw) as TutorialDemoData;
		if (!parsed || parsed.country !== country) return seeded;
		return reviveTutorialDemoData(parsed);
	} catch {
		return seeded;
	}
}

export function saveTutorialDemoState(
	country: PlayableCountry,
	state: TutorialDemoData,
): void {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(getStorageKey(country), JSON.stringify(state));
}
