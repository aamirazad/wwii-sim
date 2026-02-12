import { and, eq, gt, or } from "drizzle-orm";
import type { App } from "..";
import { db } from "../db";
import { gameStateTable, gamesTable, yearSchedulesTable } from "../db/schema";
import type { YearDurations } from "../schema";

const GAME_YEARS = [1938, 1939, 1940, 1941, 1942, 1943, 1944] as const;

interface ScheduledYearChange {
	scheduleId: number;
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
	 * Schedule all year changes for a game from database
	 */
	async scheduleGameYears(gameId: number) {
		// Clear any existing in-memory schedules for this game
		this.clearGameSchedules(gameId);

		// Load schedules from database
		const dbSchedules = await db
			.select()
			.from(yearSchedulesTable)
			.where(
				and(
					eq(yearSchedulesTable.gameId, gameId),
					gt(yearSchedulesTable.scheduledTime, new Date()),
				),
			);

		// Get current game state to filter out past years
		const [gameState] = await db
			.select()
			.from(gameStateTable)
			.where(eq(gameStateTable.gameId, gameId));

		const currentYear = gameState?.currentYear ?? 1938;
		const scheduledChanges: ScheduledYearChange[] = [];
		const now = Date.now();

		for (const schedule of dbSchedules) {
			const delay = schedule.scheduledTime.getTime() - now;

			// Only schedule future year changes that are greater than current year
			if (delay > 0 && schedule.scheduledYear > currentYear) {
				const timeout = setTimeout(() => {
					this.handleYearChange(gameId, schedule.scheduledYear);
				}, delay);

				scheduledChanges.push({
					scheduleId: schedule.id,
					gameId,
					year: schedule.scheduledYear,
					timeout,
				});

				console.log(
					`Scheduled year change to ${schedule.scheduledYear} for game ${gameId} at ${schedule.scheduledTime.toISOString()} (in ${Math.round(delay / 1000)}s)`,
				);
			}
		}

		// Store new schedules
		this.scheduledChanges.set(gameId, scheduledChanges);
	}

	/**
	 * Initialize year schedules from game year durations (for new games)
	 */
	async initializeGameSchedulesFromDurations(
		gameId: number,
		createdBy: string,
	) {
		// Get game details
		const [game] = await db
			.select()
			.from(gamesTable)
			.where(eq(gamesTable.id, gameId));

		if (!game || !game.yearDurations) {
			console.error(`Game ${gameId} not found or missing year durations`);
			return;
		}

		const schedule = this.calculateYearSchedule(
			game.startDate,
			game.yearDurations as YearDurations,
		);

		// Insert schedules into database
		for (const [year, changeTime] of schedule.entries()) {
			await db.insert(yearSchedulesTable).values({
				gameId,
				scheduledYear: year,
				scheduledTime: changeTime,
				createdBy,
				createdAt: new Date(),
			});
		}

		// Now schedule them in memory
		await this.scheduleGameYears(gameId);
	}

	/**
	 * Add a new year schedule
	 */
	async addSchedule(
		gameId: number,
		scheduledYear: number,
		scheduledTime: Date,
		createdBy: string,
	): Promise<{ id: number } | { error: string }> {
		// Validate scheduled time is in the future
		if (scheduledTime.getTime() <= Date.now()) {
			return { error: "Scheduled time must be in the future" };
		}

		// Validate year is reasonable
		const currentYear = await this.getCurrentYear(gameId);
		if (scheduledYear <= currentYear) {
			return { error: "Scheduled year must be greater than current year" };
		}

		// Insert into database
		const [inserted] = await db
			.insert(yearSchedulesTable)
			.values({
				gameId,
				scheduledYear,
				scheduledTime,
				createdBy,
				createdAt: new Date(),
			})
			.returning({ id: yearSchedulesTable.id });

		// Reschedule to pick up the new entry
		await this.scheduleGameYears(gameId);

		return { id: inserted.id };
	}

	/**
	 * Remove a year schedule
	 */
	async removeSchedule(
		scheduleId: number,
		gameId: number,
	): Promise<{ success: boolean } | { error: string }> {
		// Delete from database
		const deleted = await db
			.delete(yearSchedulesTable)
			.where(
				and(
					eq(yearSchedulesTable.id, scheduleId),
					eq(yearSchedulesTable.gameId, gameId),
				),
			)
			.returning();

		if (deleted.length === 0) {
			return { error: "Schedule not found" };
		}

		// Reschedule to remove the deleted entry from memory
		await this.scheduleGameYears(gameId);

		return { success: true };
	}

	/**
	 * Update a year schedule
	 */
	async updateSchedule(
		scheduleId: number,
		gameId: number,
		updates: { scheduledYear?: number; scheduledTime?: Date },
	): Promise<{ success: boolean } | { error: string }> {
		// Validate if updating time
		if (
			updates.scheduledTime &&
			updates.scheduledTime.getTime() <= Date.now()
		) {
			return { error: "Scheduled time must be in the future" };
		}

		// Validate if updating year
		if (updates.scheduledYear !== undefined) {
			const year = updates.scheduledYear;
			if (
				typeof year !== "number" ||
				!Number.isFinite(year) ||
				!Number.isInteger(year)
			) {
				return { error: "Scheduled year must be a valid integer" };
			}
			const currentYear = await this.getCurrentYear(gameId);
			if (year <= currentYear) {
				return { error: "Scheduled year must be greater than current year" };
			}
		}

		// Build update object
		const updateData: Partial<{
			scheduledYear: number;
			scheduledTime: Date;
		}> = {};
		if (updates.scheduledYear !== undefined) {
			updateData.scheduledYear = updates.scheduledYear;
		}
		if (updates.scheduledTime !== undefined) {
			updateData.scheduledTime = updates.scheduledTime;
		}

		if (Object.keys(updateData).length === 0) {
			return { error: "No updates provided" };
		}

		// Update in database
		const updated = await db
			.update(yearSchedulesTable)
			.set(updateData)
			.where(
				and(
					eq(yearSchedulesTable.id, scheduleId),
					eq(yearSchedulesTable.gameId, gameId),
				),
			)
			.returning();

		if (updated.length === 0) {
			return { error: "Schedule not found" };
		}

		// Reschedule to apply changes
		await this.scheduleGameYears(gameId);

		return { success: true };
	}

	/**
	 * Get all schedules for a game
	 */
	async getSchedules(gameId: number) {
		return db
			.select()
			.from(yearSchedulesTable)
			.where(eq(yearSchedulesTable.gameId, gameId));
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

		// Update game state with new year
		await db
			.update(gameStateTable)
			.set({
				currentYear: newYear,
				updatedAt: new Date(),
			})
			.where(eq(gameStateTable.gameId, gameId));

		// Broadcast year change to global room
		this.app?.server?.publish(
			"global",
			JSON.stringify({
				type: "server.year.changed",
				year: newYear,
			}),
		);
	}

	/**
	 * Clear all scheduled year changes for a game (in-memory only)
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
	 * Clear all scheduled year changes (in-memory only)
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
