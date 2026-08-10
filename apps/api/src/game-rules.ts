import type { PlayableCountry, TroopType } from "./db/schema";

export const RESOURCE_TYPES = ["oil", "steel", "population"] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const RESEARCH_TYPES = [
	"tankWarfare",
	"efficientMovement",
	"improvedWeaponry",
	"navalCombat",
	"coastalDefense",
	"submarineWarfare",
	"bombing",
	"antiAircraft",
	"improvedPlaneWeaponry",
	"dogfighting",
	"spyEvade",
	"spyEndure",
	"spyInfiltrate",
	"nuclearResearch",
] as const;

export type ResearchType = (typeof RESEARCH_TYPES)[number];

export const RESEARCH_RULES: Record<
	ResearchType,
	{
		label: string;
		category: "land" | "sea" | "air" | "spy";
		maxLevel: number;
		effect: string;
	}
> = {
	tankWarfare: {
		label: "Tank Warfare",
		category: "land",
		maxLevel: 5,
		effect:
			"Gain 20% more infantry dice when infantry is purchased at each level.",
	},
	efficientMovement: {
		label: "Efficient Movement",
		category: "land",
		maxLevel: 1,
		effect: "Reduce land movement and occupation oil costs by 20%.",
	},
	improvedWeaponry: {
		label: "Improved Weaponry",
		category: "land",
		maxLevel: 1,
		effect:
			"Once per battle, pay one steel per failed die to reroll extreme failures.",
	},
	navalCombat: {
		label: "Naval-to-Naval Combat",
		category: "sea",
		maxLevel: 5,
		effect:
			"Gain 20% more naval dice when naval ships are purchased at each level.",
	},
	coastalDefense: {
		label: "Coastal Defense",
		category: "sea",
		maxLevel: 5,
		effect:
			"Gain 20% more coastal-defense dice when they are purchased at each level.",
	},
	submarineWarfare: {
		label: "Submarine Warfare",
		category: "sea",
		maxLevel: 5,
		effect:
			"Level 1 unlocks submarines; later levels add 20% more submarine dice when purchased.",
	},
	bombing: {
		label: "Bombing",
		category: "air",
		maxLevel: 5,
		effect:
			"Gain 20% more bomber dice when bombers are purchased at each level.",
	},
	antiAircraft: {
		label: "Anti-Aircraft",
		category: "air",
		maxLevel: 5,
		effect:
			"Unlock increasingly capable city, territorial, and mobile anti-air defenses.",
	},
	improvedPlaneWeaponry: {
		label: "Improved Plane Weaponry",
		category: "air",
		maxLevel: 1,
		effect:
			"Once per battle, pay one steel per die to reroll extreme air-combat failures.",
	},
	dogfighting: {
		label: "Dogfighting",
		category: "air",
		maxLevel: 5,
		effect:
			"Gain 20% more fighter dice when fighters are purchased at each level.",
	},
	spyEvade: {
		label: "Spy Evade",
		category: "spy",
		maxLevel: 5,
		effect: "Level 1 unlocks spies; later levels make capture less likely.",
	},
	spyEndure: {
		label: "Spy Endure",
		category: "spy",
		maxLevel: 5,
		effect:
			"Captured spies become harder to turn or interrogate at each level.",
	},
	spyInfiltrate: {
		label: "Spy Infiltrate",
		category: "spy",
		maxLevel: 5,
		effect: "Add one die to spy entry and discovery rolls at each level.",
	},
	nuclearResearch: {
		label: "Nuclear Research",
		category: "air",
		maxLevel: 1,
		effect:
			"Unlock a moderator-run nuclear program for the United States, Russia, or Germany.",
	},
};

type ResourceRow = Record<ResourceType, number>;

export interface CountryRule {
	startingResources: ResourceRow;
	startingMorale: number;
	startingTokens: number;
	tokenEffect: string;
	production: ResourceRow[];
	objectives: Array<{ objective: string; reward: string }>;
	researchCosts: Record<ResearchType, { steel: number; population: number }>;
	startingResearch: Partial<Record<ResearchType, number>>;
	startingTroops: Array<{
		name: string;
		isHome: boolean;
		troops: Partial<Record<TroopType, number>>;
	}>;
}

const rows = (
	values: Array<[number, number, number]>,
	order: [ResourceType, ResourceType, ResourceType],
): ResourceRow[] =>
	values.map((value) => ({
		[order[0]]: value[0],
		[order[1]]: value[1],
		[order[2]]: value[2],
	})) as ResourceRow[];

const costs = (
	land: [number, number],
	sea: [number, number],
	air: [number, number],
	spyPopulation: number,
	nuclear: [number, number] = air,
): Record<ResearchType, { steel: number; population: number }> => ({
	tankWarfare: { steel: land[0], population: land[1] },
	efficientMovement: { steel: land[0], population: land[1] },
	improvedWeaponry: { steel: land[0], population: land[1] },
	navalCombat: { steel: sea[0], population: sea[1] },
	coastalDefense: { steel: sea[0], population: sea[1] },
	submarineWarfare: { steel: sea[0], population: sea[1] },
	bombing: { steel: air[0], population: air[1] },
	antiAircraft: { steel: air[0], population: air[1] },
	improvedPlaneWeaponry: { steel: air[0], population: air[1] },
	dogfighting: { steel: air[0], population: air[1] },
	spyEvade: { steel: 0, population: spyPopulation },
	spyEndure: { steel: 0, population: spyPopulation },
	spyInfiltrate: { steel: 0, population: spyPopulation },
	nuclearResearch: { steel: nuclear[0], population: nuclear[1] },
});

const infantry = (name: string, amount: number, isHome = false) => ({
	name,
	isHome,
	troops: { infantry: amount },
});

export const COUNTRY_RULES: Record<PlayableCountry, CountryRule> = {
	Commonwealth: {
		startingResources: { oil: 30, steel: 5, population: 10 },
		startingMorale: 50,
		startingTokens: 1,
		tokenEffect:
			"Gain 25% of the production shown at each current resource level immediately.",
		production: rows(
			[
				[1, 2, 3],
				[2, 3, 5],
				[3, 5, 7],
				[4, 6, 10],
				[5, 8, 12],
				[6, 9, 14],
				[7, 10, 16],
				[8, 12, 18],
				[9, 14, 20],
				[10, 16, 21],
				[11, 18, 23],
				[12, 20, 25],
				[13, 21, 27],
				[14, 23, 28],
				[15, 25, 29],
				[16, 26, 30],
				[17, 28, 31],
				[18, 30, 32],
				[19, 31, 33],
				[20, 33, 34],
			],
			["steel", "oil", "population"],
		),
		objectives: [
			{
				objective:
					"Ship at least half of annual oil and population production to the UK",
				reward: "+1 oil, steel, and population level",
			},
			{
				objective:
					"Retain oil and population equal to the current production row each year",
				reward: "+3 oil, steel, and population levels",
			},
			{
				objective: "Repel an attack on Commonwealth territory",
				reward: "+2 oil, steel, and population levels and +6 morale",
			},
			{
				objective: "Prevent Japan from holding the Oceanic islands",
				reward:
					"Oil level remains unrestricted; losing them sets it to 1 and costs 20 morale",
			},
		],
		researchCosts: costs([30, 20], [25, 12], [25, 12], 7),
		startingResearch: { submarineWarfare: 1 },
		startingTroops: [
			infantry("Canada", 77, true),
			infantry("British Guiana", 4),
			infantry("British Honduras", 5),
			infantry("Basutoland", 6),
			infantry("Bechuanaland Protectorate", 4),
			infantry("British Cameroons", 4),
			infantry("British Kenya", 4),
			infantry("British Somaliland", 4),
			infantry("Egypt", 35),
			infantry("Gambia", 3),
			infantry("Gold Coast", 9),
			infantry("Nigeria", 12),
			infantry("Nyasaland", 4),
			infantry("Northern Rhodesia", 4),
			infantry("Southern Rhodesia", 4),
			infantry("Sierra Leone", 5),
			infantry("South Africa", 12),
			infantry("Sudan", 8),
			infantry("Swaziland", 3),
			infantry("Tangier International Zone", 3),
			infantry("German East Africa", 3),
			infantry("Tanganyika", 3),
			infantry("Togoland", 5),
			infantry("Uganda", 8),
			infantry("Walvis Bay", 3),
			infantry("Zanzibar", 5),
			infantry("Guernsey", 5),
			infantry("Gibraltar", 18),
			infantry("Isle of Man", 3),
			infantry("Jersey", 3),
			infantry("Malta", 3),
			infantry("Northern Ireland", 12),
			infantry("Australia", 45, true),
			infantry("Oceanic Territories", 26),
			infantry("Aden", 3),
			infantry("Bahrain", 3),
			infantry("Balochistan", 3),
			infantry("Kuwait", 3),
			infantry("Palestine", 4),
			infantry("Qatar", 3),
			infantry("Transjordan", 5),
			infantry("Cyprus", 6),
			infantry("Bengal", 3),
			infantry("Brunei", 4),
			infantry("Burma", 4),
			infantry("Ceylon", 3),
			infantry("Hong Kong", 7),
			infantry("India", 28),
			infantry("Malaya", 3),
			infantry("North Borneo", 3),
			infantry("Sarawak", 3),
			infantry("Straits Settlement", 3),
			infantry("Singapore", 4),
			infantry("Indian Island Territories", 13),
			infantry("Anguilla", 8),
			infantry("Antigua and Barbuda", 5),
			infantry("Bahamas", 9),
			infantry("Barbados", 5),
			infantry("British Virgin Isles", 4),
			infantry("Cayman Islands", 3),
			infantry("Dominica", 4),
			infantry("Grenada", 4),
			infantry("Jamaica", 3),
			infantry("Montserrat", 3),
			infantry("St. Christopher and Nevis", 3),
			infantry("St. Lucia", 3),
			infantry("St. Vincent and the Grenadines", 3),
			infantry("Trinidad and Tobago", 7),
			infantry("Turks and Caicos", 5),
			infantry("Bermuda", 3),
			infantry("Falkland Islands", 3),
			{
				name: "Alexandria Naval Base",
				isHome: false,
				troops: { navalShips: 8, aircraftCarriers: 1 },
			},
			{ name: "Gaspe Naval Base", isHome: true, troops: { navalShips: 1 } },
			{
				name: "Milne Bay Naval Base",
				isHome: false,
				troops: { navalShips: 3 },
			},
		],
	},
	France: {
		startingResources: { oil: 50, steel: 30, population: 20 },
		startingMorale: 70,
		startingTokens: 1,
		tokenEffect: "Add 3 infantry dice to the Maginot Line.",
		production: rows(
			[
				[1, 0, 2],
				[1, 1, 3],
				[2, 2, 6],
				[3, 2, 8],
				[4, 3, 9],
				[5, 3, 9],
				[6, 4, 10],
				[6, 4, 10],
				[6, 5, 11],
				[6, 6, 11],
				[7, 6, 12],
				[7, 7, 12],
				[7, 8, 13],
				[8, 8, 13],
				[8, 9, 14],
				[9, 9, 14],
				[9, 10, 14],
				[10, 11, 15],
				[10, 13, 15],
				[11, 16, 15],
			],
			["steel", "oil", "population"],
		),
		objectives: [
			{
				objective:
					"Build at least 15 defensive dice at the Franco-German border",
				reward:
					"+3 oil, steel, and population points each year the front holds",
			},
			{
				objective: "Remain free of German occupation",
				reward: "+1 oil, steel, and population point per year",
			},
			{
				objective: "Defeat an Axis power",
				reward:
					"+2 oil and steel points, population points at mod discretion, and +8 morale",
			},
			{
				objective: "Sabotage Nazi power, transport, and communications",
				reward: "+1 of every level; Germany -1 steel level; morale bonus",
			},
			{
				objective: "Receive resources from the United Kingdom",
				reward: "+1 oil, steel, and population level",
			},
		],
		researchCosts: costs([12, 8], [30, 15], [13, 7], 9),
		startingResearch: { submarineWarfare: 1 },
		startingTroops: [
			infantry("Mainland France", 40, true),
			infantry("Maginot Line", 35, true),
			infantry("Morocco", 5),
			infantry("Algeria", 5),
			infantry("Tunisia", 5),
			infantry("Chad", 3),
			infantry("Congo", 3),
			infantry("Central African Republic", 3),
			infantry("Cameroon", 3),
			infantry("Gabon", 3),
			infantry("Niger", 3),
			infantry("Mali", 3),
			infantry("Guinea", 3),
			infantry("Togo", 3),
			infantry("Benin", 3),
			infantry("Burkina Faso", 3),
			infantry("Senegal", 3),
			infantry("Mauritania", 3),
			infantry("Madagascar", 5),
			infantry("Somalia", 3),
			{
				name: "Toulon Naval Base",
				isHome: true,
				troops: { navalShips: 8, aircraftCarriers: 1 },
			},
		],
	},
	Germany: {
		startingResources: { oil: 300, steel: 150, population: 120 },
		startingMorale: 90,
		startingTokens: 3,
		tokenEffect: "Add 5 dice to an infantry or air battle roll.",
		production: rows(
			[
				[2, 6, 6],
				[2, 6, 9],
				[3, 7, 13],
				[4, 7, 18],
				[5, 8, 24],
				[6, 8, 26],
				[7, 9, 27],
				[7, 9, 29],
				[8, 10, 30],
				[9, 11, 31],
				[15, 11, 33],
				[18, 12, 34],
				[20, 12, 36],
				[21, 13, 37],
				[23, 14, 38],
				[25, 14, 39],
				[27, 15, 40],
				[28, 16, 41],
				[29, 16, 42],
				[30, 17, 45],
			],
			["oil", "steel", "population"],
		),
		objectives: [
			{
				objective: "Annex Austria",
				reward: "+15 steel points and +1 steel level",
			},
			{
				objective: "Capture the Caucasus",
				reward:
					"+40 oil, +5 oil levels, unlock oil above level 10, then +5 oil yearly",
			},
			{
				objective: "Capture half of Poland",
				reward: "+3 of every level, then +1 of every level yearly while held",
			},
			{
				objective: "Capture all of Poland",
				reward: "+1 of every level, then +2 of every level yearly while held",
			},
			{
				objective: "Sink convoys with German blockades",
				reward: "+1 of every level per convoy; the UK loses the same",
			},
			{
				objective: "Capture France",
				reward:
					"+5 oil, +2 of every level, then +2 of every level yearly while held",
			},
			{
				objective: "Capture heavy water",
				reward: "May begin nuclear research in 1941 or later",
			},
			{
				objective: "Bomb British cities",
				reward:
					"Damage British morale and the war effort at moderator discretion",
			},
		],
		researchCosts: costs([15, 8], [20, 10], [15, 8], 8, [15, 8]),
		startingResearch: { tankWarfare: 1, spyEvade: 1, submarineWarfare: 1 },
		startingTroops: [
			infantry("Mainland Germany", 47, true),
			infantry("Mobilized Invasion Force", 38, true),
			{
				name: "Wilhelmshaven Naval Base",
				isHome: true,
				troops: { navalShips: 16, aircraftCarriers: 1 },
			},
		],
	},
	Italy: {
		startingResources: { oil: 50, steel: 60, population: 65 },
		startingMorale: 50,
		startingTokens: 3,
		tokenEffect:
			"Add 3 dice to an invasion in Africa and gain a bonus occupation die.",
		production: rows(
			[
				[0, 1, 4],
				[1, 1, 5],
				[2, 2, 5],
				[3, 3, 6],
				[4, 3, 6],
				[5, 4, 6],
				[6, 4, 7],
				[7, 5, 7],
				[8, 5, 8],
				[9, 5, 8],
				[10, 6, 9],
				[11, 6, 9],
				[12, 7, 10],
				[13, 7, 10],
				[14, 8, 11],
				[15, 8, 12],
				[16, 9, 12],
				[17, 10, 13],
				[18, 10, 14],
				[20, 11, 15],
			],
			["oil", "steel", "population"],
		),
		objectives: [
			{
				objective: "Take Egypt and the Suez Canal",
				reward:
					"+3 of every resource point, +1 of each point yearly while held, and +15 morale",
			},
			{
				objective: "Hold Ethiopia",
				reward: "+2 of every resource point yearly",
			},
			{
				objective: "Maintain Sicily",
				reward: "+1 of every resource point yearly",
			},
			{
				objective: "Win a battle against an Allied power",
				reward: "+1 oil level and +4 morale",
			},
			{
				objective: "Capture another African country (up to three)",
				reward: "+2 oil levels and +3 morale each",
			},
			{
				objective: "Control the Mediterranean",
				reward: "+5 of every resource point and +5 morale yearly",
			},
			{
				objective: "Capture a Balkan country",
				reward: "+2 oil, +3 steel, +2 population, and +1 morale per country",
			},
		],
		researchCosts: costs([12, 8], [30, 15], [13, 7], 11),
		startingResearch: { navalCombat: 1 },
		startingTroops: [
			infantry("Mainland Italy", 35, true),
			infantry("Italian East Africa", 22),
			infantry("Libya", 6),
			infantry("Sicily", 16, true),
			infantry("Sardinia", 9, true),
			{
				name: "La Spezia Naval Base",
				isHome: true,
				troops: { navalShips: 18, aircraftCarriers: 1 },
			},
		],
	},
	Japan: {
		startingResources: { oil: 80, steel: 100, population: 100 },
		startingMorale: 80,
		startingTokens: 2,
		tokenEffect: "Add 5 dice to a naval battle or any battle in China.",
		production: rows(
			[
				[1, 4, 3],
				[2, 6, 4],
				[3, 6, 4],
				[3, 6, 4],
				[4, 7, 5],
				[4, 7, 5],
				[5, 7, 6],
				[5, 8, 6],
				[6, 8, 7],
				[6, 9, 7],
				[7, 9, 8],
				[8, 10, 9],
				[9, 10, 10],
				[10, 11, 10],
				[12, 11, 11],
				[13, 12, 12],
				[15, 12, 12],
				[17, 13, 13],
				[19, 13, 14],
				[21, 14, 16],
			],
			["oil", "steel", "population"],
		),
		objectives: [
			{
				objective: "Hold China",
				reward: "+2 of every level and +5 morale yearly",
			},
			{
				objective: "Capture the Philippines",
				reward: "+35 oil, +5 oil levels, and +5 morale yearly",
			},
			{
				objective: "Capture important American or British Pacific holdings",
				reward: "+1 of every level yearly and +2 morale per substantial island",
			},
			{
				objective: "Hold Korea",
				reward: "+1 of every level and +4 morale yearly",
			},
			{
				objective: "Win Midway",
				reward: "+2 population levels, +2 levels of choice, and +10 morale",
			},
			{
				objective: "Capture the British Islands",
				reward: "+10 oil, +15 steel, and +2 steel levels",
			},
			{
				objective: "Capture Hawaii",
				reward: "+20 steel, +4 steel levels, +3 oil, and +3 population",
			},
		],
		researchCosts: costs([20, 10], [15, 8], [15, 8], 11),
		startingResearch: { spyEvade: 1, bombing: 1 },
		startingTroops: [
			infantry("Mainland Japan", 46, true),
			infantry("Taiwan", 8),
			infantry("Korea", 21),
			infantry("South Seas Mandate", 4),
			infantry("Southeast Asia", 45),
			infantry("China", 34),
			infantry("East Asia", 34),
			infantry("South Sakhalin", 6),
			{
				name: "Kure Naval Base",
				isHome: true,
				troops: { navalShips: 25, aircraftCarriers: 2 },
			},
			{
				name: "Truk Lagoon Naval Base",
				isHome: false,
				troops: { navalShips: 33, aircraftCarriers: 2, infantry: 1 },
			},
		],
	},
	Russia: {
		startingResources: { oil: 100, steel: 2, population: 30 },
		startingMorale: 65,
		startingTokens: 1,
		tokenEffect: "Add 5 dice when fighting in the Russian homeland.",
		production: rows(
			[
				[30, 0, 3],
				[32, 1, 5],
				[34, 1, 7],
				[37, 2, 8],
				[40, 2, 10],
				[48, 3, 12],
				[56, 3, 14],
				[63, 4, 15],
				[70, 4, 17],
				[77, 5, 20],
				[83, 7, 22],
				[89, 10, 25],
				[95, 13, 28],
				[100, 17, 32],
				[104, 21, 36],
				[108, 25, 40],
				[111, 30, 42],
				[114, 34, 45],
				[116, 40, 48],
				[117, 45, 51],
			],
			["oil", "steel", "population"],
		),
		objectives: [
			{
				objective: "Capture a significant part of Poland",
				reward: "+2 of every level, +10 steel, and +6 morale",
			},
			{
				objective: "Capture all of Poland",
				reward: "+20 steel and +10 morale",
			},
			{
				objective: "Hold the southern oil fields",
				reward: "+1 oil level yearly; losing them costs 10 oil levels",
			},
			{
				objective: "Defeat Germany",
				reward:
					"+2 levels of choice and +4 morale per victory; -4 morale per loss",
			},
			{
				objective: "Stabilize Ukraine",
				reward: "+1 of every resource point yearly and +8 morale per victory",
			},
			{
				objective: "Capture Finland",
				reward:
					"+3 of every level, +20 of every resource point, and +15 morale",
			},
		],
		researchCosts: costs([20, 10], [15, 8], [15, 8], 9, [15, 8]),
		startingResearch: { spyEvade: 1, spyEndure: 1, spyInfiltrate: 1 },
		startingTroops: [
			infantry("Mainland USSR", 46, true),
			infantry("Ukraine", 20, true),
			infantry("Siberia", 15, true),
			{ name: "Leningrad Naval Base", isHome: true, troops: { navalShips: 8 } },
			{ name: "Kara Sea", isHome: true, troops: { navalShips: 4 } },
			{ name: "East Siberian Sea", isHome: true, troops: { navalShips: 6 } },
			{ name: "Black Sea", isHome: true, troops: { navalShips: 6 } },
		],
	},
	"United Kingdom": {
		startingResources: { oil: 0, steel: 30, population: 30 },
		startingMorale: 60,
		startingTokens: 2,
		tokenEffect: "Add 5 dice to any naval or air battle.",
		production: rows(
			[
				[2, 1, 3],
				[4, 1, 6],
				[5, 2, 7],
				[7, 2, 9],
				[8, 3, 10],
				[10, 4, 11],
				[12, 5, 12],
				[14, 5, 13],
				[15, 6, 15],
				[17, 6, 17],
				[19, 7, 19],
				[22, 8, 22],
				[25, 9, 25],
				[27, 10, 28],
				[29, 11, 31],
				[32, 11, 34],
				[35, 12, 37],
				[37, 13, 40],
				[39, 14, 43],
				[41, 15, 46],
			],
			["steel", "oil", "population"],
		),
		objectives: [
			{
				objective: "Win a battle against an Axis power",
				reward: "+3 of every level and +4 morale per victory",
			},
			{
				objective: "The Commonwealth wins a battle",
				reward: "+2 of every level",
			},
			{ objective: "Another ally wins a battle", reward: "+1 of every level" },
			{
				objective: "Fight with forces from at least two allied countries",
				reward: "+1 of every level",
			},
			{
				objective: "Protect American convoys",
				reward:
					"Each convoy sunk costs 1 of every level and 3 morale; Germany gains those levels",
			},
			{
				objective: "Send at least 12 resources to France",
				reward:
					"+1 of every level for both countries and a French morale bonus",
			},
			{
				objective: "Destroy Germany's heavy water",
				reward: "Prevent a German nuclear bomb and gain 10 morale",
			},
		],
		researchCosts: costs([20, 10], [15, 8], [15, 8], 12),
		startingResearch: {
			spyEvade: 1,
			spyEndure: 1,
			spyInfiltrate: 1,
			dogfighting: 1,
			submarineWarfare: 1,
		},
		startingTroops: [
			infantry("Mainland United Kingdom", 58, true),
			infantry("Northern Ireland", 12, true),
			infantry("Norway", 17),
			infantry("Denmark", 18),
			{ name: "Orkney Naval Base", isHome: true, troops: { navalShips: 58 } },
		],
	},
	"United States": {
		startingResources: { oil: 999999, steel: 0, population: 0 },
		startingMorale: 10,
		startingTokens: 0,
		tokenEffect: "Send up to 8 resources without paying the transport cost.",
		production: rows(
			[
				[0, 8, 2],
				[0, 16, 12],
				[0, 20, 18],
				[0, 28, 20],
				[0, 31, 30],
				[0, 33, 32],
				[0, 36, 35],
				[0, 39, 40],
				[0, 42, 45],
				[0, 46, 47],
				[0, 49, 49],
				[0, 52, 52],
				[0, 55, 55],
				[0, 58, 56],
				[0, 62, 58],
				[0, 65, 60],
				[0, 69, 61],
				[0, 72, 62],
				[0, 76, 64],
				[0, 80, 65],
			],
			["oil", "steel", "population"],
		),
		objectives: [
			{
				objective: "End the Great Depression",
				reward:
					"Reach level 5 population and steel, +1 research level, +20 steel, +18 population, and +40 morale",
			},
			{
				objective: "Officially declare war",
				reward: "+5 steel and population levels",
			},
			{
				objective: "Send 20 steel to an ally",
				reward: "+2 steel and population levels",
			},
			{
				objective: "Defeat Japan",
				reward: "+1 steel and population level and +4 morale per victory",
			},
			{
				objective: "Defend Midway",
				reward: "+2 steel and population levels and +15 morale",
			},
			{
				objective: "Push Germany out of territory",
				reward: "+2 steel and population levels and +6 morale each",
			},
			{
				objective: "Help an ally dislodge an Axis power using US resources",
				reward: "+1 steel and population level",
			},
			{
				objective: "Pass a New Deal",
				reward:
					"+1 population level, +5 population, depression progress, and +3 morale",
			},
			{
				objective: "Pass the Lend-Lease Act",
				reward:
					"+1 population level yearly before entering the war and +5 morale",
			},
		],
		researchCosts: costs([30, 20], [25, 12], [25, 12], 9, [25, 12]),
		startingResearch: {
			spyEvade: 1,
			spyEndure: 1,
			spyInfiltrate: 1,
			submarineWarfare: 1,
		},
		startingTroops: [
			infantry("Mainland East Coast (stationary coastal defense)", 55, true),
			infantry("Mainland West Coast (stationary coastal defense)", 55, true),
			infantry("Hawaii (stationary coastal defense)", 20),
			infantry("Puerto Rico (stationary coastal defense)", 10),
			infantry("Alaska (stationary coastal defense)", 10),
			infantry("Midway Islands (stationary coastal defense)", 5),
			infantry("Philippines (stationary coastal defense)", 10),
			infantry("Panama Canal Zone (stationary)", 10),
			infantry("American Samoa (stationary coastal defense)", 3),
			infantry("Guantanamo (stationary coastal defense)", 3),
			infantry("Danish Virgin Islands (stationary coastal defense)", 3),
			{
				name: "Pearl Harbor",
				isHome: true,
				troops: { navalShips: 28, aircraftCarriers: 3, fighters: 9 },
			},
			{
				name: "East Coast Naval Base",
				isHome: true,
				troops: { navalShips: 25, aircraftCarriers: 2, fighters: 6 },
			},
		],
	},
};

export function productionFor(
	country: PlayableCountry,
	resource: ResourceType,
	level: number,
) {
	const clampedLevel = Math.min(20, Math.max(1, level));
	return COUNTRY_RULES[country].production[clampedLevel - 1][resource];
}

export function moraleAnnualEffect(morale: number) {
	const noResources = { oil: 0, steel: 0, population: 0 };
	if (morale <= 50) return { levelDelta: 0, resourceDelta: noResources };
	if (morale <= 70)
		return {
			levelDelta: 0,
			resourceDelta: { oil: 1, steel: 1, population: 5 },
		};
	if (morale <= 80)
		return {
			levelDelta: 0,
			resourceDelta: { oil: 2, steel: 2, population: 5 },
		};
	if (morale <= 90)
		return {
			levelDelta: 0,
			resourceDelta: { oil: 3, steel: 3, population: 6 },
		};
	return { levelDelta: 1, resourceDelta: noResources };
}
