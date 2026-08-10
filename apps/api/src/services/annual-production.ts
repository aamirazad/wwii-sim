import { eq } from "drizzle-orm";
import { db } from "../db";
import {
	type Country,
	countryStateTable,
	type PlayableCountry,
	resourceChangeLogTable,
} from "../db/schema";
import {
	moraleAnnualEffect,
	productionFor,
	RESOURCE_TYPES,
} from "../game-rules";

const clampLevel = (level: number) => Math.min(20, Math.max(1, level));

export async function processAnnualProduction(
	gameId: number,
	targetYear: number,
) {
	const countries = await db
		.select()
		.from(countryStateTable)
		.where(eq(countryStateTable.gameId, gameId));
	const updatedCountries = [];

	for (const country of countries) {
		if (country.name === "Mods") continue;
		const countryName = country.name as PlayableCountry;
		let state = country;
		for (
			let processingYear = state.lastProcessedYear + 1;
			processingYear <= targetYear;
			processingYear += 1
		) {
			const moraleEffect = moraleAnnualEffect(state.morale);
			const levelIncrease = 1 + moraleEffect.levelDelta;
			const levels = {
				oil: clampLevel(state.oilLevel + levelIncrease),
				steel: clampLevel(state.steelLevel + levelIncrease),
				population: clampLevel(state.populationLevel + levelIncrease),
			};
			const production = {
				oil:
					productionFor(countryName, "oil", levels.oil) +
					(state.name === "Japan" && processingYear <= 1941 ? 15 : 0),
				steel: productionFor(countryName, "steel", levels.steel),
				population: productionFor(countryName, "population", levels.population),
			};
			const resources = {
				oil:
					state.name === "United States"
						? state.oil
						: Math.max(
								0,
								state.oil + production.oil + moraleEffect.resourceDelta,
							),
				steel: Math.max(
					0,
					state.steel + production.steel + moraleEffect.resourceDelta,
				),
				population: Math.max(
					0,
					state.population + production.population + moraleEffect.resourceDelta,
				),
			};

			const previousState = state;
			[state] = await db
				.update(countryStateTable)
				.set({
					...resources,
					oilLevel: levels.oil,
					steelLevel: levels.steel,
					populationLevel: levels.population,
					lastProcessedYear: processingYear,
					updatedAt: new Date(),
				})
				.where(eq(countryStateTable.id, state.id))
				.returning();

			for (const resourceType of RESOURCE_TYPES) {
				if (previousState[resourceType] === state[resourceType]) continue;
				await db.insert(resourceChangeLogTable).values({
					countryStateId: state.id,
					gameId,
					resourceType,
					previousValue: previousState[resourceType],
					newValue: state[resourceType],
					note: `${processingYear} annual production (level ${levels[resourceType]}, morale ${state.morale})`,
					changedBy: "system",
					createdAt: new Date(),
				});
			}
		}
		updatedCountries.push({
			name: state.name as Country,
			resources: {
				oil: state.oil,
				steel: state.steel,
				population: state.population,
			},
		});
	}

	return updatedCountries;
}
