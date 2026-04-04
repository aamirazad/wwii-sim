import type {
	Announcement,
	CountryResources,
	CountryState,
	PlayableCountry,
	ResourceChangeLog,
	TroopChangeLog,
	TroopLocation,
} from "@api/schema";

export interface TutorialDemoData {
	country: PlayableCountry;
	resources: CountryResources;
	countryState: CountryState;
	troopLocations: TroopLocation[];
	resourceLogs: ResourceChangeLog[];
	troopLogs: TroopChangeLog[];
	announcements: Announcement[];
}

const DEMO_RESOURCES_BY_COUNTRY: Record<PlayableCountry, CountryResources> = {
	Commonwealth: { steel: 18, oil: 26, population: 34 },
	France: { steel: 30, oil: 22, population: 28 },
	Germany: { steel: 44, oil: 39, population: 46 },
	Italy: { steel: 24, oil: 20, population: 30 },
	Japan: { steel: 33, oil: 31, population: 26 },
	Russia: { steel: 29, oil: 24, population: 48 },
	"United Kingdom": { steel: 27, oil: 21, population: 29 },
	"United States": { steel: 40, oil: 200, population: 50 },
};

function minutesAgo(minutes: number): Date {
	return new Date(Date.now() - minutes * 60 * 1000);
}

export function getTutorialDemoData(
	country: PlayableCountry,
): TutorialDemoData {
	const resources = DEMO_RESOURCES_BY_COUNTRY[country];
	const countryState: CountryState = {
		id: 9001,
		name: country,
		gameId: 1940,
		oil: resources.oil,
		steel: resources.steel,
		population: resources.population,
		createdAt: minutesAgo(180),
		updatedAt: minutesAgo(1),
	};

	const resourceLogs: ResourceChangeLog[] = [
		{
			id: 1,
			countryStateId: countryState.id,
			gameId: countryState.gameId,
			resourceType: "steel",
			previousValue: 0,
			newValue: resources.steel + 12,
			note: "Starting reserve",
			changedBy: "Tutorial System",
			createdAt: minutesAgo(160),
		},
		{
			id: 2,
			countryStateId: countryState.id,
			gameId: countryState.gameId,
			resourceType: "steel",
			previousValue: resources.steel + 12,
			newValue: resources.steel,
			note: "Built armored divisions",
			changedBy: "Quartermaster",
			createdAt: minutesAgo(120),
		},
		{
			id: 3,
			countryStateId: countryState.id,
			gameId: countryState.gameId,
			resourceType: "oil",
			previousValue: 0,
			newValue: resources.oil + 15,
			note: "Starting reserve",
			changedBy: "Tutorial System",
			createdAt: minutesAgo(160),
		},
		{
			id: 4,
			countryStateId: countryState.id,
			gameId: countryState.gameId,
			resourceType: "oil",
			previousValue: resources.oil + 15,
			newValue: resources.oil,
			note: "Fleet redeployment",
			changedBy: "Logistics",
			createdAt: minutesAgo(85),
		},
		{
			id: 5,
			countryStateId: countryState.id,
			gameId: countryState.gameId,
			resourceType: "population",
			previousValue: 0,
			newValue: resources.population + 8,
			note: "Starting reserve",
			changedBy: "Tutorial System",
			createdAt: minutesAgo(160),
		},
		{
			id: 6,
			countryStateId: countryState.id,
			gameId: countryState.gameId,
			resourceType: "population",
			previousValue: resources.population + 8,
			newValue: resources.population,
			note: "Conscription for new units",
			changedBy: "General Staff",
			createdAt: minutesAgo(72),
		},
	];

	const troopLocations: TroopLocation[] = [
		{
			id: 200,
			countryStateId: countryState.id,
			gameId: countryState.gameId,
			name: `${country} Homeland`,
			isHome: true,
			infantry: 12,
			navalShips: 2,
			aircraftCarriers: 1,
			fighters: 4,
			bombers: 1,
			spies: 1,
			submarines: 1,
			createdAt: minutesAgo(150),
			updatedAt: minutesAgo(14),
		},
		{
			id: 201,
			countryStateId: countryState.id,
			gameId: countryState.gameId,
			name: "Frontline Command",
			isHome: false,
			infantry: 8,
			navalShips: 0,
			aircraftCarriers: 0,
			fighters: 3,
			bombers: 2,
			spies: 0,
			submarines: 0,
			createdAt: minutesAgo(105),
			updatedAt: minutesAgo(6),
		},
	];

	const troopLogs: TroopChangeLog[] = [
		{
			id: 31,
			countryStateId: countryState.id,
			gameId: countryState.gameId,
			actionType: "purchase",
			infantry: 6,
			navalShips: 1,
			aircraftCarriers: 0,
			fighters: 2,
			bombers: 1,
			spies: 0,
			submarines: 1,
			details: "Purchased before Year 1941 turn",
			oilCost: 13,
			populationCost: 15,
			steelCost: 18,
			changedBy: "Quartermaster",
			createdAt: minutesAgo(70),
		},
		{
			id: 32,
			countryStateId: countryState.id,
			gameId: countryState.gameId,
			actionType: "movement",
			infantry: 4,
			navalShips: 0,
			aircraftCarriers: 0,
			fighters: 2,
			bombers: 1,
			spies: 0,
			submarines: 0,
			details: "Moved to Frontline Command",
			oilCost: 7,
			populationCost: 0,
			steelCost: 0,
			changedBy: "Field Marshal",
			createdAt: minutesAgo(44),
		},
		{
			id: 33,
			countryStateId: countryState.id,
			gameId: countryState.gameId,
			actionType: "loss",
			infantry: 2,
			navalShips: 0,
			aircraftCarriers: 0,
			fighters: 0,
			bombers: 1,
			spies: 0,
			submarines: 0,
			details: "Losses after contested naval strike",
			oilCost: 0,
			populationCost: 0,
			steelCost: 0,
			changedBy: "Battle Report",
			createdAt: minutesAgo(18),
		},
	];

	const announcements: Announcement[] = [
		{
			id: 501,
			gameId: countryState.gameId,
			content:
				"# Year 1941 briefing\nAll countries submit troop purchases before the timer expires.",
			targetCountries: null,
			createdBy: "Moderator Team",
			createdAt: minutesAgo(50),
		},
		{
			id: 502,
			gameId: countryState.gameId,
			content:
				"## Combat update\nFrontline losses have been posted. Check your resource and troop logs for exact numbers.",
			targetCountries: null,
			createdBy: "Battle Operations",
			createdAt: minutesAgo(24),
		},
		{
			id: 503,
			gameId: countryState.gameId,
			content:
				"### Moderator approval reminder\nTrade agreements and disputed troop movements require moderator confirmation.",
			targetCountries: null,
			createdBy: "Head Moderator",
			createdAt: minutesAgo(10),
		},
	];

	return {
		country,
		resources,
		countryState,
		troopLocations,
		resourceLogs,
		troopLogs,
		announcements,
	};
}
