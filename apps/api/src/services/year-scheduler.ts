import { eq, or } from "drizzle-orm";
import type { App } from "..";
import { db } from "../db";
import {
	type Country,
	countryStateTable,
	gameStateTable,
	gamesTable,
	resourceChangeLogTable,
} from "../db/schema";
import type { YearDurations } from "../schema";

const GAME_YEARS = [1938, 1939, 1940, 1941, 1942, 1943, 1944] as const;

interface ScheduledYearChange {
	gameId: number;
	year: number;
	timeout: NodeJS.Timeout;
}

class YearScheduler {
	private scheduledChanges: Map<number, ScheduledYearChange[]> = new Map();
	private app: App | null = null;

	setApp(app: App) {
		this.app = app;
	}

	/**
	 * Calculate the absolute time when each year should change
	 */
	private calculateYearSchedule(
		startDate: Date,
		yearDurations: YearDurations,
	): Map<number, Date> {
		const schedule = new Map<number, Date>();
		let currentTime = startDate.getTime();

		for (const year of GAME_YEARS) {
			const yearStr = year.toString() as keyof YearDurations;
			const durationMinutes = yearDurations[yearStr];

			if (durationMinutes > 0) {
				// Add duration to get the time when this year ends (next year starts)
				currentTime += durationMinutes * 60 * 1000;
				const nextYear = year + 1;
				if (GAME_YEARS.includes(nextYear as (typeof GAME_YEARS)[number])) {
					schedule.set(nextYear, new Date(currentTime));
				}
			}
		}

		return schedule;
	}

	/**
	 * Schedule all year changes for a game
	 */
	async scheduleGameYears(gameId: number) {
		// Get game details
		const [game] = await db
			.select()
			.from(gamesTable)
			.where(eq(gamesTable.id, gameId));

		if (!game || !game.yearDurations) {
			console.error(`Game ${gameId} not found or missing year durations`);
			return;
		}

		// Get or create game state
		let [gameState] = await db
			.select()
			.from(gameStateTable)
			.where(eq(gameStateTable.gameId, gameId));

		if (!gameState) {
			[gameState] = await db
				.insert(gameStateTable)
				.values({
					gameId,
					currentYear: 1938,
					data: null,
					updatedAt: new Date(),
				})
				.returning();
		}

		const schedule = this.calculateYearSchedule(
			game.startDate,
			game.yearDurations as YearDurations,
		);

		const scheduledChanges: ScheduledYearChange[] = [];
		const now = Date.now();

		for (const [year, changeTime] of schedule.entries()) {
			const delay = changeTime.getTime() - now;

			// Only schedule future year changes
			if (delay > 0 && year > gameState.currentYear) {
				const timeout = setTimeout(() => {
					this.handleYearChange(gameId, year);
				}, delay);

				scheduledChanges.push({
					gameId,
					year,
					timeout,
				});

				console.log(
					`Scheduled year change to ${year} for game ${gameId} at ${changeTime.toISOString()} (in ${Math.round(delay / 1000)}s)`,
				);
			}
		}

		// Clear any existing schedules for this game
		this.clearGameSchedules(gameId);

		// Store new schedules
		this.scheduledChanges.set(gameId, scheduledChanges);
	}

	/**
	 * Handle a year change event
	 */
	async handleYearChange(gameId: number, newYear: number) {
		const [gameState] = await db
			.select({ currentYear: gameStateTable.currentYear })
			.from(gameStateTable)
			.where(eq(gameStateTable.gameId, gameId));
		if (gameState.currentYear >= newYear) return;

		console.log(`Year changing to ${newYear} for game ${gameId}`);

		// Update game state with new year
		await db
			.update(gameStateTable)
			.set({
				currentYear: newYear,
				updatedAt: new Date(),
			})
			.where(eq(gameStateTable.gameId, gameId));

		// Get all countries for this game
		const countries = await db
			.select()
			.from(countryStateTable)
			.where(eq(countryStateTable.gameId, gameId));

		// Update resources for each country (+1 oil, steel, population)
		const RESOURCE_INCREMENT = 1;

		for (const country of countries) {
			const newOil = country.oil + RESOURCE_INCREMENT;
			const newSteel = country.steel + RESOURCE_INCREMENT;
			const newPopulation = country.population + RESOURCE_INCREMENT;

			// Update country resources
			await db
				.update(countryStateTable)
				.set({
					oil: newOil,
					steel: newSteel,
					population: newPopulation,
					updatedAt: new Date(),
				})
				.where(eq(countryStateTable.id, country.id));

			// Log resource changes
			const resources = [
				{ type: "oil" as const, oldValue: country.oil, newValue: newOil },
				{
					type: "steel" as const,
					oldValue: country.steel,
					newValue: newSteel,
				},
				{
					type: "population" as const,
					oldValue: country.population,
					newValue: newPopulation,
				},
			];

			for (const resource of resources) {
				await db.insert(resourceChangeLogTable).values({
					countryStateId: country.id,
					gameId,
					resourceType: resource.type,
					previousValue: resource.oldValue,
					newValue: resource.newValue,
					note: `Year ${newYear}`,
					changedBy: "system",
					createdAt: new Date(),
				});
			}

			// Broadcast new year message to country subscribers
			const countryName = country.name as Country;
			this.app?.server?.publish(
				`country:${countryName}`,
				JSON.stringify({
					type: "server.year.changed",
					year: newYear,
					resourceChanges: {
						oil: RESOURCE_INCREMENT,
						steel: RESOURCE_INCREMENT,
						population: RESOURCE_INCREMENT,
					},
				}),
			);

			// Also send updated resources
			this.app?.server?.publish(
				`country:${countryName}`,
				JSON.stringify({
					type: "server.country.resources",
					country: countryName,
					resources: {
						oil: newOil,
						steel: newSteel,
						population: newPopulation,
					},
				}),
			);
		}

		console.log(
			`Year changed to ${newYear} for game ${gameId}. Resources incremented by ${RESOURCE_INCREMENT}.`,
		);
	}

	/**
	 * Clear all scheduled year changes for a game
	 */
	clearGameSchedules(gameId: number) {
		const schedules = this.scheduledChanges.get(gameId);
		if (schedules) {
			for (const schedule of schedules) {
				clearTimeout(schedule.timeout);
			}
			this.scheduledChanges.delete(gameId);
		}
	}

	/**
	 * Clear all scheduled year changes
	 */
	clearAll() {
		for (const gameId of this.scheduledChanges.keys()) {
			this.clearGameSchedules(gameId);
		}
	}

	/**
	 * Get current year for a game
	 */
	async getCurrentYear(gameId: number): Promise<number> {
		const [gameState] = await db
			.select()
			.from(gameStateTable)
			.where(eq(gameStateTable.gameId, gameId));

		return gameState?.currentYear ?? 1938;
	}

	/**
	 * Re-schedule years for active games on server start
	 */
	async initializeActiveGames() {
		const activeGames = await db
			.select()
			.from(gamesTable)
			.where(
				or(
					eq(gamesTable.status, "active"),
					eq(gamesTable.status, "waiting"),
					eq(gamesTable.status, "paused"),
				),
			);

		for (const game of activeGames) {
			if (game.status === "active") {
				await this.scheduleGameYears(game.id);
			}
		}

		console.log(
			`Initialized year scheduler for ${activeGames.length} active game(s)`,
		);
	}
}

export const yearScheduler = new YearScheduler();
